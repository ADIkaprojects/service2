'use client';

import { confidenceLabel } from '@/lib/utils/confidence';

interface ConfidenceBarProps {
  score: number;
}

export function ConfidenceBar({ score }: ConfidenceBarProps) {
  const label = confidenceLabel(score);

  // Map label to color & width
  const config = {
    high: {
      color: '#10b981', // green/emerald
      bg: 'rgba(16, 185, 129, 0.1)',
      text: 'HIGH CONFIDENCE',
    },
    medium: {
      color: '#f59e0b', // amber
      bg: 'rgba(245, 158, 11, 0.1)',
      text: 'MEDIUM CONFIDENCE',
    },
    low: {
      color: '#f97316', // orange
      bg: 'rgba(249, 115, 22, 0.1)',
      text: 'LOW CONFIDENCE',
    },
    very_low: {
      color: '#ef4444', // red
      bg: 'rgba(239, 68, 68, 0.1)',
      text: 'VERY LOW CONFIDENCE',
    },
  };

  const active = config[label];
  const percentage = Math.round(score * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: active.color, letterSpacing: '0.05em' }}>
          {active.text}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc' }}>
          {percentage}%
        </span>
      </div>
      {/* Bar Track */}
      <div
        style={{
          height: '6px',
          width: '100%',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            borderRadius: '3px',
            background: active.color,
            boxShadow: `0 0 10px ${active.color}`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
