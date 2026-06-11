'use client';

import React, { useState } from 'react';

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

interface SessionSidebarProps {
  sessions: SessionListItem[];
  selectedSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onDeleteSession?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function SessionSidebar({
  sessions,
  selectedSessionId,
  onSelectSession,
  onDeleteSession,
  isLoading = false,
}: SessionSidebarProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'complete' | 'failed'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status mapping to label and style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return { text: 'Complete', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', color: '#10b981' };
      case 'failed':
        return { text: 'Failed', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', color: '#ef4444' };
      case 'partial':
        return { text: 'Partial', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' };
      case 'idle':
        return { text: 'Idle', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' };
      default:
        // Any intermediate status counts as running / in progress
        return { text: 'Processing', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' };
    }
  };

  const isProcessingStatus = (status: string) => {
    return !['complete', 'failed', 'partial', 'idle'].includes(status);
  };

  // Filtering
  const filteredSessions = sessions.filter((s) => {
    // Search
    const searchString = `${s.resolvedCompanyName || ''} ${s.resolvedPersonName || ''} ${s.resolvedCompanyDomain || ''} ${s.ip || ''} ${s.sessionId}`.toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) {
      return false;
    }

    // Tab Filter
    if (filter === 'complete') {
      return s.pipelineStatus === 'complete' || s.pipelineStatus === 'partial';
    }
    if (filter === 'failed') {
      return s.pipelineStatus === 'failed';
    }
    if (filter === 'active') {
      return isProcessingStatus(s.pipelineStatus);
    }
    return true;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDeleteSession) return;
    if (confirm('Are you sure you want to permanently delete this session? This action is GDPR-compliant and deletes all associated enrichments, consents, and logs.')) {
      setDeletingId(id);
      try {
        await onDeleteSession(id);
        if (selectedSessionId === id) {
          onSelectSession(null);
        }
      } catch (err) {
        console.error('Delete failed:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div
      style={{
        width: '380px',
        borderRight: '1px solid var(--border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10, 10, 15, 0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Search and Filters Header */}
      <div
        style={{
          padding: '24px 20px 16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            VISITOR SESSIONS
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.4)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: '8px',
              }}
            >
              {sessions.length}
            </span>
          </h2>
          {onSelectSession && selectedSessionId && (
            <button
              onClick={() => onSelectSession(null)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6366f1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Show Overview
            </button>
          )}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Search by IP, Company, Person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              color: '#f8fafc',
              fontSize: '13px',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '2px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          {(['all', 'active', 'complete', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'capitalize',
                borderRadius: '6px',
                border: 'none',
                background: filter === tab ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                color: filter === tab ? '#f8fafc' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'active' ? 'Active' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Session list items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: '13px' }}>
            No sessions found
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = selectedSessionId === session.sessionId;
            const badge = getStatusBadge(session.pipelineStatus);
            const isProcessing = isProcessingStatus(session.pipelineStatus);

            return (
              <div
                key={session.sessionId}
                onClick={() => onSelectSession(session.sessionId)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isSelected
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }
                  // Show delete button on hover
                  const delBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                  if (delBtn) delBtn.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                  // Hide delete button on leave
                  const delBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                  if (delBtn) delBtn.style.opacity = '0';
                }}
              >
                {/* Line 1: Header / Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isSelected ? '#f8fafc' : '#e2e8f0',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.resolvedCompanyName ||
                      session.resolvedPersonName ||
                      (session.ip ? `IP: ${session.ip}` : `Session: ${session.sessionId.substring(0, 8)}...`)}
                  </span>
                  
                  {/* Status Indicator Badge */}
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isProcessing && (
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: badge.color,
                          display: 'inline-block',
                        }}
                        className="animate-pulse"
                      />
                    )}
                    {badge.text}
                  </span>
                </div>

                {/* Line 2: Details / Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{new Date(session.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {session.finalVerifiedEmailCount > 0 && (
                    <span
                      style={{
                        color: '#10b981',
                        fontWeight: 600,
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      {session.finalVerifiedEmailCount} verified
                    </span>
                  )}
                </div>

                {/* GDPR Deletion Button */}
                {onDeleteSession && (
                  <button
                    onClick={(e) => handleDelete(e, session.sessionId)}
                    disabled={deletingId === session.sessionId}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      bottom: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: deletingId === session.sessionId ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      opacity: 0,
                      transition: 'opacity 0.2s ease, background-color 0.2s',
                      color: '#ef4444',
                    }}
                    title="GDPR Compliant Deletion"
                    className="delete-btn"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    {deletingId === session.sessionId ? (
                      <span style={{ fontSize: '10px' }}>...</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
