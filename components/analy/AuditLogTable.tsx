'use client';

import { useState } from 'react';

interface AuditLog {
  action: string;
  actor: string;
  details?: Record<string, any>;
  ip?: string;
  timestamp: string | Date;
}

interface AuditLogTableProps {
  auditLogs: AuditLog[];
}

export function AuditLogTable({ auditLogs }: AuditLogTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.01)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Header Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: 'none',
          color: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 8h10M7 12h10M7 16h10" />
          </svg>
          System Audit Log ({auditLogs.length})
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {expanded ? 'Collapse Log ▲' : 'Expand Log ▼'}
        </span>
      </button>

      {/* Expanded Table */}
      {expanded && (
        <div style={{ width: '100%', overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>TIMESTAMP</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>ACTION</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>ACTOR</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>IP ADDRESS</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                    No audit records available.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      fontSize: '12px',
                    }}
                  >
                    <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#e2e8f0' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                      <span
                        style={{
                          background: log.actor === 'worker' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                          color: log.actor === 'worker' ? '#6366f1' : 'var(--text-muted)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '10px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {log.actor}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {log.ip || 'system'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
