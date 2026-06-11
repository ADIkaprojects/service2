'use client';

import React from 'react';

interface ProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | null;
  sessionDetails: {
    session: Record<string, any>;
    consent?: Record<string, any>;
    ipEnrichment?: Record<string, any>;
    companyProfile?: Record<string, any>;
    identityCandidates?: Array<Record<string, any>>;
    patternSources?: Array<Record<string, any>>;
    emailCandidates?: Array<Record<string, any>>;
    verifiedEmails?: Array<Record<string, any>>;
    pipelineJobs?: Array<Record<string, any>>;
    auditLogs?: Array<Record<string, any>>;
  } | null;
}

export function ProvenanceDrawer({ isOpen, onClose, email, sessionDetails }: ProvenanceDrawerProps) {
  if (!isOpen || !sessionDetails) return null;

  const {
    session,
    consent,
    ipEnrichment,
    companyProfile,
    identityCandidates = [],
    patternSources = [],
    emailCandidates = [],
    verifiedEmails = [],
  } = sessionDetails;

  // Find the specific email details we want to show provenance for
  const verifiedEmail = verifiedEmails.find((v) => v.email === email) || verifiedEmails[0];
  const activeEmail = email || (verifiedEmail ? verifiedEmail.email : null);

  if (!activeEmail) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '460px',
          height: '100vh',
          background: '#0e0e14',
          borderLeft: '1px solid var(--border)',
          zIndex: 1000,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#64748b',
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', color: '#f8fafc', cursor: 'pointer' }}>Close</button>
        No verified emails resolved for this session.
      </div>
    );
  }

  // Find the candidate corresponding to this verified email
  const candidate = emailCandidates.find((c) => c.email === activeEmail);
  
  // Find pattern source information for the domain
  const domain = activeEmail.split('@')[1];
  const matchingPatterns = patternSources.filter((p) => p.domain === domain);

  // Identity matches
  const identityMatch = identityCandidates.find(
    (i) => i.email === activeEmail || (i.firstName && activeEmail.includes(i.firstName.toLowerCase()))
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '520px',
          height: '100vh',
          background: '#0a0a0f',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflowY: 'auto',
          animation: 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: '#0a0a0f',
            zIndex: 10,
          }}
        >
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6366f1', fontWeight: 700, letterSpacing: '0.05em' }}>
              Data Provenance & Audit
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0 0' }}>
              Identity Resolution Path
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f8fafc';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            Close
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          {/* Active Email Highlight */}
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
            }}
          >
            <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Resolved Entity
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', wordBreak: 'break-all', marginTop: '4px' }}>
              {activeEmail}
            </div>
            {verifiedEmail && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: verifiedEmail.verificationStatus === 'valid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: verifiedEmail.verificationStatus === 'valid' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${verifiedEmail.verificationStatus === 'valid' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  }}
                >
                  {verifiedEmail.verificationStatus === 'valid' ? 'VALIDATED' : 'CATCH-ALL OK'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#a78bfa',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  Confidence Score: {Math.round(verifiedEmail.confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Audit Chain Header */}
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: '8px 0 0 0' }}>
            Verification Evidence Chain
          </h4>

          {/* Timeline Nodes */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '24px' }}>
            {/* Timeline Vertical Line */}
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '12px',
                bottom: '12px',
                width: '1px',
                background: 'linear-gradient(to bottom, #6366f1, #10b981)',
              }}
            />

            {/* Step 1: Lawful Basis Gate */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  border: '3px solid #0a0a0f',
                  boxShadow: '0 0 8px #6366f1',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                1. Consent & Lawful Basis Gate
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>Lawful Basis Established:</strong>{' '}
                  <span style={{ color: session.lawfulBasisEstablished ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {session.lawfulBasisEstablished ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                {consent ? (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                    <div>Scopes: {consent.consentScopes?.join(', ') || 'None'}</div>
                    <div>Text version: {consent.consentTextVersion}</div>
                    <div>Granted at: {new Date(consent.createdAt).toLocaleString()}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444' }}>
                    No consent record found in database. Personal lookup locked.
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Browser & IP Enrichment */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  border: '3px solid #0a0a0f',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                2. First-Party IP Resolution
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>Visitor IP:</strong> {session.ip || 'Unknown'}
                </div>
                {ipEnrichment ? (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#64748b' }}>
                    <div>Organization: {ipEnrichment.asnName || ipEnrichment.org || 'Unknown'}</div>
                    <div>Domain: {ipEnrichment.domain || 'N/A'}</div>
                    <div>Location: {ipEnrichment.city}, {ipEnrichment.countryName}</div>
                    <div>Hosting/Datacenter: {ipEnrichment.isDatacenter ? 'Yes' : 'No'}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                    No IP enrichment data captured yet.
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Company Profile */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  border: '3px solid #0a0a0f',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                3. Firmographic Enrichment
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {companyProfile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <strong>Company Name:</strong> {companyProfile.name}
                    </div>
                    <div>
                      <strong>Primary Domain:</strong> {companyProfile.primaryDomain || companyProfile.websiteUrl || 'Unknown'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      <div>Revenue: {companyProfile.annualRevenueRange || `$${(companyProfile.annualRevenue || 0).toLocaleString()}`}</div>
                      <div>Employees: {companyProfile.estimatedNumEmployees || 'N/A'}</div>
                      <div>Industry: {companyProfile.industry || 'N/A'}</div>
                      <div>Founded: {companyProfile.foundedYear || 'N/A'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    No firmographic matching profiles returned.
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: Identity lookup */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  border: '3px solid #0a0a0f',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                4. Identity Cascade Match
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {identityMatch ? (
                  <div>
                    <div>
                      <strong>Matched Person:</strong> {identityMatch.fullName || `${identityMatch.firstName} ${identityMatch.lastName}`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      <div>Source Path: {identityMatch.source.toUpperCase()} People Match</div>
                      {identityMatch.linkedinUrl && <div>LinkedIn: <a href={identityMatch.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>Profile Link</a></div>}
                      <div>Match Confidence: {Math.round(identityMatch.confidence * 100)}%</div>
                    </div>
                  </div>
                ) : session.oauthEmail || session.manualEmail ? (
                  <div>
                    <div>
                      <strong>Manual/OAuth Entry:</strong> {session.oauthEmail || session.manualEmail}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      Method: {session.oauthProvider ? `OAuth (${session.oauthProvider})` : 'Work Email Submission'}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    No direct email resolved in Identity Cascade. Defaulted to domain pattern generator.
                  </div>
                )}
              </div>
            </div>

            {/* Step 5: Domain Pattern Discovery */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  border: '3px solid #0a0a0f',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                5. Email Pattern Extraction
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {matchingPatterns.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchingPatterns.map((p, idx) => (
                      <div key={idx} style={{ paddingBottom: idx < matchingPatterns.length - 1 ? '8px' : 0, borderBottom: idx < matchingPatterns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div>
                          <strong>Source:</strong> {p.source.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          Patterns: {p.detectedPatterns?.map((pat: string) => (
                            <span key={pat} style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>{pat}</span>
                          )) || 'None'}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
                          Example Emails: {p.exampleEmails?.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    No domain search logs available. Using fallback standard patterns.
                  </div>
                )}
              </div>
            </div>

            {/* Step 6: Candidate generation & LLM */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#06b6d4',
                  border: '3px solid #0a0a0f',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                6. LLM Inference & Candidate Ranking
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {candidate ? (
                  <div>
                    <div>
                      <strong>Generation Mode:</strong> {candidate.source === 'llm_inference' ? 'Mistral AI Inference' : candidate.source.replace(/_/g, ' ')}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      <div>Pattern structure: {candidate.pattern}</div>
                      <div>Base generation score: {Math.round(candidate.confidence * 100)}%</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    Email candidate generated directly.
                  </div>
                )}
              </div>
            </div>

            {/* Step 7: Verification */}
            <div style={{ position: 'relative' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '4px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '3px solid #0a0a0f',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                7. Multi-Provider Verification
              </h5>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {verifiedEmail ? (
                  <div>
                    <div>
                      <strong>SMTP / MX Check:</strong>{' '}
                      <span style={{ color: verifiedEmail.mxValid && verifiedEmail.smtpAccepted ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {verifiedEmail.mxValid ? 'MX OK' : 'No MX'} / {verifiedEmail.smtpAccepted ? 'SMTP OK' : 'SMTP N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      <div>Primary Verifier: {verifiedEmail.verificationProvider?.toUpperCase() || 'HUNTER'}</div>
                      <div>Catch-all domain: {verifiedEmail.isCatchAll ? 'Yes' : 'No'}</div>
                      <div>Disposable email: {verifiedEmail.isDisposable ? 'Yes' : 'No'}</div>
                      <div>Last Checked: {new Date(verifiedEmail.lastCheckedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    Verification details unavailable.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
