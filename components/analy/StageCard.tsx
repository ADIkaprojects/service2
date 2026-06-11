'use client';

import { JobStatus, JobType } from '@/types/pipeline';

interface StageCardProps {
  stageType: JobType;
  status: JobStatus;
  durationMs?: number;
  errorMessage?: string;
  outputSummary?: Record<string, any>;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

export function StageCard({
  stageType,
  status,
  durationMs,
  errorMessage,
  outputSummary,
  startedAt,
  completedAt,
}: StageCardProps) {
  const stageLabels: Record<JobType, string> = {
    ip_enrichment: 'IP Intelligence Enrichment',
    identity_lookup: 'Identity Lookup Cascade',
    company_enrichment: 'Company Enrichment',
    domain_discovery: 'Domain & Pattern Discovery',
    email_generation: 'Email Candidates Generation',
    email_verification: 'Email Verification Verification',
  };

  const statusColors: Record<JobStatus, { color: string; border: string; bg: string; text: string }> = {
    complete: {
      color: '#10b981',
      border: 'rgba(16, 185, 129, 0.2)',
      bg: 'rgba(16, 185, 129, 0.04)',
      text: 'Completed',
    },
    running: {
      color: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.2)',
      bg: 'rgba(59, 130, 246, 0.04)',
      text: 'Running',
    },
    failed: {
      color: '#ef4444',
      border: 'rgba(239, 68, 68, 0.2)',
      bg: 'rgba(239, 68, 68, 0.04)',
      text: 'Failed',
    },
    queued: {
      color: '#94a3b8',
      border: 'rgba(255, 255, 255, 0.05)',
      bg: 'rgba(255, 255, 255, 0.01)',
      text: 'Queued',
    },
    skipped: {
      color: '#475569',
      border: 'rgba(255, 255, 255, 0.03)',
      bg: 'rgba(255, 255, 255, 0.005)',
      text: 'Skipped',
    },
  };

  const activeStatus = statusColors[status] || statusColors.queued;

  const renderDetails = () => {
    if (status === 'skipped') {
      return <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>Stage skipped (no lawful identity input or consent limit).</p>;
    }
    if (status === 'failed') {
      return (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', display: 'block', marginBottom: '2px' }}>Error Details</span>
          <p style={{ fontSize: '12px', color: '#fca5a5', margin: '0', fontFamily: 'monospace', wordBreak: 'break-all' }}>{errorMessage || 'An error occurred during stage execution.'}</p>
        </div>
      );
    }
    if (status === 'complete' && outputSummary) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(outputSummary).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    if (status === 'running') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#3b82f6' }}>
          <div style={{ width: '12px', height: '12px', border: '1.5px solid transparent', borderTopColor: '#3b82f6', borderRadius: '50%' }} className="animate-spin" />
          Processing pipeline data...
        </div>
      );
    }
    return <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>Waiting for preceding stage to complete.</p>;
  };

  return (
    <div
      style={{
        borderRadius: '16px',
        border: `1px solid ${activeStatus.border}`,
        background: activeStatus.bg,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 2px 0' }}>
            {stageLabels[stageType]}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {stageType.replace('_', ' ')}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: activeStatus.color,
              padding: '2px 8px',
              borderRadius: '12px',
              background: `rgba(${activeStatus.color === '#10b981' ? '16, 185, 129' : activeStatus.color === '#3b82f6' ? '59, 130, 246' : activeStatus.color === '#ef4444' ? '239, 68, 68' : '148, 163, 184'}, 0.1)`,
              border: `1px solid rgba(${activeStatus.color === '#10b981' ? '16, 185, 129' : activeStatus.color === '#3b82f6' ? '59, 130, 246' : activeStatus.color === '#ef4444' ? '239, 68, 68' : '148, 163, 184'}, 0.2)`,
            }}
          >
            {activeStatus.text}
          </span>
          {durationMs !== undefined && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {(durationMs / 1000).toFixed(2)}s latency
            </span>
          )}
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />

      <div>{renderDetails()}</div>
    </div>
  );
}
