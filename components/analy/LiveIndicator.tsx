'use client';

interface LiveIndicatorProps {
  status: 'connecting' | 'connected' | 'disconnected';
}

export function LiveIndicator({ status }: LiveIndicatorProps) {
  const statusConfig = {
    connected: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: 'Live Stream Connected',
    },
    connecting: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: 'Reconnecting Stream',
    },
    disconnected: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: 'Stream Offline',
    },
  };

  const active = statusConfig[status];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: active.bg,
        border: `1px solid ${active.border}`,
        fontSize: '11px',
        fontWeight: 600,
        color: active.color,
        letterSpacing: '0.02em',
        transition: 'all 0.3s ease',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: active.color,
          boxShadow: `0 0 8px ${active.color}`,
        }}
        className={status !== 'disconnected' ? 'animate-pulse' : ''}
      />
      {active.text}
    </div>
  );
}
