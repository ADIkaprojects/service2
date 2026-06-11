'use client';

import React, { useState, useEffect } from 'react';
import { SessionSidebar } from './SessionSidebar';
import { AggregateStats } from './AggregateStats';
import { PipelineTimeline } from './PipelineTimeline';
import { VerifiedEmailsPanel } from './VerifiedEmailsPanel';
import { EmailCandidatesTable } from './EmailCandidatesTable';
import { AuditLogTable } from './AuditLogTable';
import { LiveIndicator } from './LiveIndicator';
import { ProvenanceDrawer } from './ProvenanceDrawer';
import { IpEnrichmentPanel } from './IpEnrichmentPanel';

interface SessionListItem {
  sessionId: string;
  ip?: string;
  userAgent?: string;
  pipelineStatus: string;
  lawfulBasisEstablished: boolean;
  resolvedCompanyDomain?: string;
  resolvedCompanyName?: string;
  resolvedPersonName?: string;
  finalVerifiedEmailCount: number;
  createdAt: string | Date;
}

export function PipelineDashboard() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const sessionsRef = React.useRef(sessions);
  sessionsRef.current = sessions;

  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Provenance drawer state
  const [inspectedEmail, setInspectedEmail] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch session listing on mount
  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch('/api/analy/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions list:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch session details when selection changes
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setSessionDetailsLoading(true);
        const res = await fetch(`/api/analy/session/${selectedSessionId}`);
        const data = await res.json();
        if (data.success) {
          setSessionDetails(data.data);
        } else {
          console.error('Failed to load session details:', data.error);
        }
      } catch (err) {
        console.error('Error fetching session details:', err);
      } finally {
        setSessionDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [selectedSessionId]);

  // Subscribe to SSE stream for real-time pipeline updates
  useEffect(() => {
    if (!selectedSessionId) {
      setStreamStatus('disconnected');
      return;
    }

    const currentSession = sessionsRef.current.find((s) => s.sessionId === selectedSessionId);
    const isTerminal =
      currentSession &&
      ['complete', 'failed', 'partial'].includes(currentSession.pipelineStatus);

    if (isTerminal) {
      setStreamStatus('disconnected');
      return;
    }

    setStreamStatus('connecting');
    const eventSource = new EventSource(`/api/analy/session/${selectedSessionId}/stream`);

    eventSource.onopen = () => {
      setStreamStatus('connected');
    };

    eventSource.onerror = () => {
      setStreamStatus('disconnected');
      // If error occurs, let's close it after a retry fallback
      eventSource.close();
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventType, data } = payload;

        if (eventType === 'heartbeat') return;

        setSessionDetails((prev: any) => {
          if (!prev) return null;

          const updatedSession = { ...prev.session };
          let updatedIpEnrichment = prev.ipEnrichment;
          let updatedCompanyProfile = prev.companyProfile;
          const updatedIdentityCandidates = [...(prev.identityCandidates || [])];
          const updatedPatternSources = [...(prev.patternSources || [])];
          const updatedEmailCandidates = [...(prev.emailCandidates || [])];
          const updatedVerifiedEmails = [...(prev.verifiedEmails || [])];
          const updatedPipelineJobs = [...(prev.pipelineJobs || [])];
          const updatedAuditLogs = [...(prev.auditLogs || [])];

          switch (eventType) {
            case 'pipeline_status':
              // Handled by connection
              break;

            case 'job_queued':
            case 'job_started':
            case 'job_complete':
            case 'job_failed': {
              const jobData = data;
              const existingJobIdx = updatedPipelineJobs.findIndex((j) => j.jobType === jobData.jobType);
              if (existingJobIdx > -1) {
                updatedPipelineJobs[existingJobIdx] = {
                  ...updatedPipelineJobs[existingJobIdx],
                  status: jobData.status,
                  startedAt: jobData.startedAt || updatedPipelineJobs[existingJobIdx].startedAt,
                  completedAt: jobData.completedAt || updatedPipelineJobs[existingJobIdx].completedAt,
                  errorMessage: jobData.errorMessage || updatedPipelineJobs[existingJobIdx].errorMessage,
                  durationMs: jobData.durationMs || updatedPipelineJobs[existingJobIdx].durationMs,
                  outputSummary: jobData.outputSummary || updatedPipelineJobs[existingJobIdx].outputSummary,
                };
              } else {
                updatedPipelineJobs.push(jobData);
              }

              if (eventType === 'job_started') {
                const statusMap: Record<string, string> = {
                  ip_enrichment: 'ip_enriching',
                  identity_lookup: 'identity_lookup',
                  company_enrichment: 'company_enriching',
                  domain_discovery: 'domain_discovery',
                  email_generation: 'email_generating',
                  email_verification: 'email_verifying',
                };
                updatedSession.pipelineStatus = statusMap[jobData.jobType] || updatedSession.pipelineStatus;
              }
              break;
            }

            case 'ip_result':
              updatedIpEnrichment = data;
              if (data.org || data.asnName) {
                updatedSession.resolvedCompanyName = data.org || data.asnName;
              }
              if (data.domain) {
                updatedSession.resolvedCompanyDomain = data.domain;
              }
              break;

            case 'company_result':
              updatedCompanyProfile = data;
              if (data.name) {
                updatedSession.resolvedCompanyName = data.name;
              }
              if (data.primaryDomain) {
                updatedSession.resolvedCompanyDomain = data.primaryDomain;
              }
              break;

            case 'identity_result': {
              const ident = data;
              if (!updatedIdentityCandidates.some((i) => i._id === ident._id || (i.source === ident.source && i.email === ident.email))) {
                updatedIdentityCandidates.push(ident);
              }
              if (ident.fullName) {
                updatedSession.resolvedPersonName = ident.fullName;
              }
              break;
            }

            case 'domain_result': {
              const pat = data;
              if (!updatedPatternSources.some((p) => p._id === pat._id || (p.source === pat.source && p.domain === pat.domain))) {
                updatedPatternSources.push(pat);
              }
              break;
            }

            case 'email_candidate': {
              const cand = data;
              if (!updatedEmailCandidates.some((c) => c.email === cand.email)) {
                updatedEmailCandidates.push(cand);
              }
              updatedEmailCandidates.sort((a, b) => a.rank - b.rank);
              break;
            }

            case 'email_verified': {
              const ver = data;
              if (!updatedVerifiedEmails.some((v) => v.email === ver.email)) {
                updatedVerifiedEmails.push(ver);
              }
              updatedSession.finalVerifiedEmailCount = updatedVerifiedEmails.length;
              break;
            }

            case 'pipeline_complete':
              updatedSession.pipelineStatus = 'complete';
              updatedSession.pipelineCompletedAt = new Date().toISOString();
              eventSource.close();
              setStreamStatus('disconnected');
              break;

            case 'pipeline_failed':
              updatedSession.pipelineStatus = 'failed';
              updatedSession.pipelineCompletedAt = new Date().toISOString();
              eventSource.close();
              setStreamStatus('disconnected');
              break;
          }

          // Keep sidebar in sync
          setSessions((prevSessions) =>
            prevSessions.map((s) => {
              if (s.sessionId === selectedSessionId) {
                return {
                  ...s,
                  pipelineStatus: updatedSession.pipelineStatus,
                  resolvedCompanyName: updatedSession.resolvedCompanyName,
                  resolvedPersonName: updatedSession.resolvedPersonName,
                  resolvedCompanyDomain: updatedSession.resolvedCompanyDomain,
                  finalVerifiedEmailCount: updatedSession.finalVerifiedEmailCount,
                };
              }
              return s;
            })
          );

          // Log major transitions locally
          const logActions: Record<string, string> = {
            job_started: 'Stage started',
            job_complete: 'Stage complete',
            job_failed: 'Stage failed',
            ip_result: 'IP enriched',
            company_result: 'Company enriched',
            identity_result: 'Identity match found',
            email_verified: 'Email candidate verified',
            pipeline_complete: 'Pipeline complete',
            pipeline_failed: 'Pipeline failed',
          };
          if (logActions[eventType]) {
            updatedAuditLogs.push({
              action: `${logActions[eventType]}: ${
                eventType === 'job_started' || eventType === 'job_complete' || eventType === 'job_failed'
                  ? data.jobType
                  : data.email || data.name || ''
              }`,
              actor: 'worker',
              timestamp: new Date().toISOString(),
              details: data,
            });
          }

          return {
            session: updatedSession,
            consent: prev.consent,
            ipEnrichment: updatedIpEnrichment,
            companyProfile: updatedCompanyProfile,
            identityCandidates: updatedIdentityCandidates,
            patternSources: updatedPatternSources,
            emailCandidates: updatedEmailCandidates,
            verifiedEmails: updatedVerifiedEmails,
            pipelineJobs: updatedPipelineJobs,
            auditLogs: updatedAuditLogs,
          };
        });
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedSessionId]);

  // Handle GDPR delete
  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/pipeline/session/${id}/delete`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Remove from local list
        setSessions((prev) => prev.filter((s) => s.sessionId !== id));
      } else {
        alert(`Delete failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('GDPR erasure failed:', err);
      alert('Network error during GDPR erasure.');
    }
  };

  const openProvenance = (email: string) => {
    setInspectedEmail(email);
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0f' }}>
      {/* Sidebar List */}
      <SessionSidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
        onDeleteSession={handleDeleteSession}
        isLoading={sessionsLoading}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top Navbar */}
        <div
          style={{
            padding: '16px 32px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(10,10,15,0.4)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.05em' }}>
              SIGNAL
            </span>
            <span style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Visitor Enrichment Dashboard
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {selectedSessionId && <LiveIndicator status={streamStatus} />}
            <button
              onClick={fetchSessions}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedSessionId ? (
            sessionDetailsLoading ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b', fontSize: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid transparent',
                      borderTopColor: '#6366f1',
                      borderRadius: '50%',
                    }}
                    className="animate-spin"
                  />
                  Retrieving session data models...
                </div>
              </div>
            ) : !sessionDetails ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444' }}>
                Failed to load details for this session.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
                {/* Session Header details */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border)',
                    padding: '24px',
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      <span>SESSION ID: {sessionDetails.session.sessionId}</span>
                      <span>•</span>
                      <span>IP: {sessionDetails.session.ip || 'Anonymous'}</span>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      {sessionDetails.session.resolvedCompanyName ||
                        sessionDetails.session.resolvedPersonName ||
                        'Anonymous Corporate Visitor'}
                    </h2>
                    {sessionDetails.session.resolvedCompanyDomain && (
                      <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: 500 }}>
                        {sessionDetails.session.resolvedCompanyDomain}
                      </span>
                    )}
                  </div>

                  {sessionDetails.verifiedEmails && sessionDetails.verifiedEmails.length > 0 && (
                    <button
                      onClick={() => openProvenance(sessionDetails.verifiedEmails[0].email)}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: 'none',
                        color: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)';
                      }}
                    >
                      Audit Data Provenance
                    </button>
                  )}
                </div>

                {/* Overall Progress Banner */}
                {(() => {
                  const jobs = sessionDetails.pipelineJobs || [];
                  const completedJobs = jobs.filter((j: any) => j.status === 'complete' || j.status === 'skipped' || j.status === 'failed');
                  const totalStages = 6;
                  const progressPercent = Math.round((completedJobs.length / totalStages) * 100);
                  
                  let overallStatusText = 'Enriching Visitor Identity...';
                  if (sessionDetails.session.pipelineStatus === 'complete') {
                    overallStatusText = 'Pipeline Complete';
                  } else if (sessionDetails.session.pipelineStatus === 'failed') {
                    overallStatusText = 'Pipeline Interrupted / Failed';
                  } else if (sessionDetails.session.pipelineStatus === 'ip_enriching') {
                    overallStatusText = 'Resolving IP Address Network...';
                  } else if (sessionDetails.session.pipelineStatus === 'identity_lookup') {
                    overallStatusText = 'Performing Identity Cascade...';
                  } else if (sessionDetails.session.pipelineStatus === 'company_enriching') {
                    overallStatusText = 'Enriching Company Profile...';
                  } else if (sessionDetails.session.pipelineStatus === 'domain_discovery') {
                    overallStatusText = 'Discovering Corporate Domains...';
                  } else if (sessionDetails.session.pipelineStatus === 'email_generating') {
                    overallStatusText = 'Generating Candidate Emails...';
                  } else if (sessionDetails.session.pipelineStatus === 'email_verifying') {
                    overallStatusText = 'Running SMTP Verification checks...';
                  }

                  return (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                          Overall Pipeline Progress
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: sessionDetails.session.pipelineStatus === 'complete' ? '#10b981' : sessionDetails.session.pipelineStatus === 'failed' ? '#ef4444' : '#6366f1',
                          }}
                        >
                          {overallStatusText} ({progressPercent}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '3px',
                          width: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: sessionDetails.session.pipelineStatus === 'failed' 
                              ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                              : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                            width: `${progressPercent}%`,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* IP Enrichment Detail Panel */}
                <IpEnrichmentPanel
                  ipEnrichment={sessionDetails.ipEnrichment}
                  sessionIp={sessionDetails.session.ip}
                />

                {/* Dashboard Grid split: Left Column Timeline & Log | Right Column Verified & Candidates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'flex-start' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <PipelineTimeline jobs={sessionDetails.pipelineJobs || []} />
                    <AuditLogTable auditLogs={sessionDetails.auditLogs || []} />
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div
                      onClick={(e) => {
                        // Intercept clicks on verified emails to trigger provenance drawer
                        const target = e.target as HTMLElement;
                        const card = target.closest('[key]') as HTMLElement;
                        if (card) {
                          // Find email in card
                          const emailText = card.querySelector('span[style*="word-break: break-all"]')?.textContent || 
                                            card.querySelector('span[style*="wordBreak: \'break-all\'"]')?.textContent ||
                                            card.querySelector('span')?.textContent;
                          if (emailText && emailText.includes('@')) {
                            openProvenance(emailText.trim());
                          }
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <VerifiedEmailsPanel verifiedEmails={sessionDetails.verifiedEmails || []} />
                    </div>
                    
                    <EmailCandidatesTable candidates={sessionDetails.emailCandidates || []} />
                  </div>
                </div>
              </div>
            )
          ) : (
            <AggregateStats sessions={sessions} />
          )}
        </div>
      </div>

      {/* Slide-out Data Provenance Panel */}
      <ProvenanceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        email={inspectedEmail}
        sessionDetails={sessionDetails}
      />
    </div>
  );
}
