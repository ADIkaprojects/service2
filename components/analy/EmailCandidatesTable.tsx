'use client';

import { VerificationStatus } from '@/types/pipeline';

interface EmailCandidate {
  email: string;
  pattern: string;
  rank: number;
  confidenceScore: number;
  rationale: string;
  verificationStatus: VerificationStatus;
  generatedBy?: 'mistral' | 'pattern_code' | 'direct_lookup';
  verificationProvider?: string;
}

interface EmailCandidatesTableProps {
  candidates: EmailCandidate[];
}

export function EmailCandidatesTable({ candidates }: EmailCandidatesTableProps) {
  const statusColors: Record<VerificationStatus, { color: string; bg: string }> = {
    valid: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    invalid: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    catch_all: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    risky: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    pending: { color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.05)' },
    running: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    unknown: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
    error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  };

  const renderSourceBadge = (c: EmailCandidate) => {
    const gen = c.generatedBy || 'pattern_code';
    if (gen === 'direct_lookup') {
      const rat = (c.rationale || '').toLowerCase();
      let label = 'Direct Lookup';
      if (rat.includes('apollo')) label = 'Apollo (Direct)';
      else if (rat.includes('oauth')) label = 'OAuth (Direct)';
      else if (rat.includes('snov')) label = 'Snov (Direct)';
      else if (rat.includes('hunter')) label = 'Hunter (Direct)';

      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      );
    }

    if (gen === 'mistral') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            textTransform: 'uppercase',
          }}
        >
          Mistral LLM
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          textTransform: 'uppercase',
        }}
      >
        Pattern Code
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0' }}>
          Inferred Email Candidates ({candidates.length})
        </h2>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Up to 50 variations scored &amp; ranked
        </span>
      </div>

      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '60px' }}>RANK</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>EMAIL CANDIDATE</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '130px' }}>SOURCE</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '100px' }}>PATTERN</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '90px' }}>SCORE</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '130px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>RATIONALE / EVIDENCE</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                  No candidates generated yet. Complete the identity lookup and domain discovery stages.
                </td>
              </tr>
            ) : (
              candidates.map((c) => {
                const status = statusColors[c.verificationStatus] || statusColors.pending;
                return (
                  <tr
                    key={c.email}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background-color 0.2s ease',
                    }}
                    className="hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      #{c.rank}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {renderSourceBadge(c)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', fontSize: '11px' }}>
                        {c.pattern}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: status.color }}>
                      {Math.round(c.confidenceScore * 100)}%
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: status.bg,
                            color: status.color,
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.verificationStatus === 'running' && (
                            <span style={{ width: '6px', height: '6px', border: '1px solid transparent', borderTopColor: status.color, borderRadius: '50%' }} className="animate-spin" />
                          )}
                          {c.verificationStatus}
                        </span>
                        {c.verificationProvider && (
                          <span style={{ fontSize: '10px', color: '#64748b', paddingLeft: '4px' }}>
                            via {c.verificationProvider}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {c.rationale}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
