'use client';

interface AggregateStatsProps {
  sessions: Array<Record<string, any>>;
}

export function AggregateStats({ sessions }: AggregateStatsProps) {
  const totalSessions = sessions.length;
  
  const completedSessions = sessions.filter((s) => s.pipelineStatus === 'complete');
  const totalCompleted = completedSessions.length;

  const enrichedSessions = completedSessions.filter((s) => s.finalVerifiedEmailCount > 0);
  const totalEnriched = enrichedSessions.length;

  // Match rate is percentage of completed sessions that resolved at least 1 verified email
  const matchRate = totalCompleted > 0 ? Math.round((totalEnriched / totalCompleted) * 100) : 0;

  // Gather top resolved companies
  const companyCounts: Record<string, number> = {};
  for (const s of sessions) {
    if (s.resolvedCompanyName) {
      companyCounts[s.resolvedCompanyName] = (companyCounts[s.resolvedCompanyName] || 0) + 1;
    }
  }

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Welcome Banner */}
      <div
        style={{
          padding: '32px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.03) 50%, rgba(6,182,212,0.08) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0', color: '#f8fafc' }}>
          SIGNAL Platform Metrics
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0', lineHeight: '1.6', maxWidth: '600px' }}>
          Consent-first real-time visitor identity resolution overview. Select a specific session from the sidebar to inspect execution logic, data provenance, and candidate lists.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {/* Metric 1 */}
        <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Captured Sessions
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', margin: '8px 0 2px 0' }}>
            {totalSessions}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981' }}>Active logs stored</span>
        </div>

        {/* Metric 2 */}
        <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pipeline Completed
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', margin: '8px 0 2px 0' }}>
            {totalCompleted}
          </div>
          <span style={{ fontSize: '12px', color: '#3b82f6' }}>Fully processed runs</span>
        </div>

        {/* Metric 3 */}
        <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enrichment Match Rate
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', margin: '8px 0 2px 0' }}>
            {matchRate}%
          </div>
          <span style={{ fontSize: '12px', color: '#10b981' }}>Resolved identity found</span>
        </div>
      </div>

      {/* Bottom Layout section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Top Companies List */}
        <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
            Top Resolved Organizations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCompanies.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#475569' }}>No organizations resolved yet.</span>
            ) : (
              topCompanies.map(([company, count]) => (
                <div key={company} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{company}</span>
                  <span
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#6366f1',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {count} visits
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health / Queue Info */}
        <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
            Worker Infrastructure
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>IP Enrichment Worker:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Identity Cascade Worker:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Company Enrichment Worker:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Mistral AI Inference Worker:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
