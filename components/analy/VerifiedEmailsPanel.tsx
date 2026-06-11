'use client';

interface VerifiedEmail {
  email: string;
  domain: string;
  verificationProvider: string;
  verificationStatus: 'valid' | 'catch_all_accepted';
  mxValid: boolean;
  smtpAccepted: boolean;
  isCatchAll: boolean;
  confidenceScore: number;
  sourceType: 'oauth' | 'user_input' | 'direct_lookup' | 'generated_and_verified';
  personName?: string;
  companyName?: string;
}

interface VerifiedEmailsPanelProps {
  verifiedEmails: VerifiedEmail[];
}

export function VerifiedEmailsPanel({ verifiedEmails }: VerifiedEmailsPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0' }}>
          Verified High-Confidence Emails ({verifiedEmails.length})
        </h2>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Passed strict verification thresholds
        </span>
      </div>

      {verifiedEmails.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px dashed var(--border)',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: '#475569', marginBottom: '12px' }}
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0', fontWeight: 500 }}>
            No verified emails resolved yet
          </p>
          <p style={{ fontSize: '12px', color: '#475569', margin: '0' }}>
            The pipeline will write results here once verification completes.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {verifiedEmails.map((v) => {
            const isCatchAll = v.verificationStatus === 'catch_all_accepted';
            return (
              <div
                key={v.email}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Status Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: isCatchAll ? '#f59e0b' : '#10b981',
                      background: isCatchAll ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${isCatchAll ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {isCatchAll ? 'Catch-All Accepted' : 'SMTP Validated'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                    {Math.round(v.confidenceScore * 100)}% Match
                  </span>
                </div>

                {/* Email Display */}
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-all' }}>
                    {v.email}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                    <span>Source: {v.sourceType.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>Verifier: {v.verificationProvider}</span>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  {v.personName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Contact Name:</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{v.personName}</span>
                    </div>
                  )}
                  {v.companyName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Company:</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{v.companyName}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>MX / SMTP check:</span>
                    <span style={{ color: v.mxValid && v.smtpAccepted ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                      {v.mxValid ? 'MX OK' : 'No MX'} / {v.smtpAccepted ? 'SMTP OK' : 'SMTP N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
