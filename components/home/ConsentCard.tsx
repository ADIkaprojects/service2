'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ConsentScope } from '@/types/pipeline';

// ── Types ─────────────────────────────────────────────────────────────────

type Step = 'consent' | 'processing' | 'error';

interface ConsentState {
  scopes: ConsentScope[];
  agreedAt: string | null;
}

const CONSENT_SCOPES: Array<{
  id: ConsentScope;
  label: string;
  description: string;
  required: boolean;
}> = [
  {
    id: 'ip_enrichment',
    label: 'IP Intelligence',
    description: 'Analyze your IP address for geolocation and network context',
    required: true,
  },
  {
    id: 'geolocation',
    label: 'Geolocation',
    description: 'Determine your approximate geographic location',
    required: true,
  },
  {
    id: 'email_discovery',
    label: 'Email Discovery',
    description: 'Discover and verify your professional email address',
    required: false,
  },
  {
    id: 'company_enrichment',
    label: 'Company Enrichment',
    description: 'Enrich data about your organization from public sources',
    required: false,
  },
  {
    id: 'oauth',
    label: 'OAuth Profile',
    description: 'Read your name and email from Google or Microsoft sign-in',
    required: false,
  },
];

// ── Main Component ─────────────────────────────────────────────────────────

export function ConsentCard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('consent');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [consent, setConsent] = useState<ConsentState>({
    scopes: ['ip_enrichment', 'geolocation', 'email_discovery', 'company_enrichment', 'oauth'],
    agreedAt: null,
  });

  const handleConsentAgree = useCallback(async () => {
    const agreedAt = new Date().toISOString();
    setConsent((prev) => ({ ...prev, agreedAt }));
    setStep('processing');

    try {
      // 1. Create the session and consent
      const res = await fetch('/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentScopes: consent.scopes,
          consentTextVersion: '1.0.0',
          agreedAt,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        throw new Error(data?.error?.message ?? 'Failed to start pipeline');
      }

      const resJson = await res.json() as { success: boolean; data?: { sessionId?: string } };
      if (!resJson.success || !resJson.data?.sessionId) {
        throw new Error('No sessionId returned from server');
      }

      const activeSessionId = resJson.data.sessionId;

      // 2. Immediately trigger the anonymous pipeline (IP enrichment only)
      const anonRes = await fetch('/api/pipeline/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });

      if (!anonRes.ok) {
        const anonData = (await anonRes.json()) as { error?: { message?: string } };
        throw new Error(anonData?.error?.message ?? 'Failed to start anonymous session');
      }

      const anonData = (await anonRes.json()) as { data?: { sessionId?: string } };
      const returnedSessionId = anonData?.data?.sessionId || activeSessionId;
      router.push(returnedSessionId ? `/analy?sessionId=${returnedSessionId}` : '/analy');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setStep('error');
    }
  }, [consent.scopes, router]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        borderRadius: '24px',
        overflow: 'hidden',
      }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: 'absolute',
          inset: '-1px',
          borderRadius: '25px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.3), rgba(6,182,212,0.5))',
          zIndex: 0,
        }}
      />

      {/* Card body */}
      <div
        className="glass"
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: '23px',
          padding: '0',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            height: '2px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
          }}
        />

        <div style={{ padding: '32px' }}>
          {step === 'consent' && (
            <ConsentStep
              scopes={consent.scopes}
              onToggle={() => {}}
              onAgree={handleConsentAgree}
            />
          )}
          {step === 'processing' && <ProcessingStep />}
          {step === 'error' && (
            <ErrorStep message={errorMessage} onRetry={() => setStep('consent')} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step: Consent ──────────────────────────────────────────────────────────

function ConsentStep({
  scopes,
  onToggle,
  onAgree,
}: {
  scopes: ConsentScope[];
  onToggle: (s: ConsentScope) => void;
  onAgree: () => void;
}) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', alignItems: 'center' }}>
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: '1.3',
            marginBottom: '12px',
          }}
        >
          Data Collection Consent
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '360px', margin: '0 auto' }}>
          By agreeing, you authorize Signal to enrich your IP address, company network details, and professional profile signals.
        </p>
      </div>

      {/* Single Agreement CTA */}
      <button
        onClick={onAgree}
        className="glow-indigo"
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          letterSpacing: '0.01em',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          marginTop: '8px',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
        }}
      >
        Agree &amp; Continue →
      </button>
    </div>
  );
}

// ── Step: Processing ───────────────────────────────────────────────────────

function ProcessingStep() {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '20px 0',
        minHeight: '260px',
      }}
    >
      {/* Spinner */}
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.2)',
          }}
        />
        <div
          className="animate-spin-slow"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366f1',
            borderRightColor: '#8b5cf6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(6,182,212,0.3))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="animate-pulse-glow"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Analyzing your signal...
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Running IP intelligence, identity lookup,
          <br />
          and company enrichment pipeline
        </p>
      </div>

      {/* Progress stages */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {['IP Enrichment', 'Identity Lookup', 'Company Enrichment', 'Email Discovery'].map(
          (stage, i) => (
            <div
              key={stage}
              className={`animate-slide-up delay-${(i + 1) * 150 > 700 ? 700 : (i + 1) * 150}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="animate-pulse-glow"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  animationDelay: `${i * 0.3}s`,
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stage}</span>
              <div style={{ flex: 1 }} />
              <div
                className="animate-spin-slow"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(99,102,241,0.3)',
                  borderTopColor: '#6366f1',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── Step: Error ────────────────────────────────────────────────────────────

function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="animate-scale-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '20px 0',
        textAlign: 'center',
        minHeight: '200px',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--error-dim)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Something went wrong
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '300px' }}>
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: '1px solid rgba(239,68,68,0.4)',
          background: 'var(--error-dim)',
          color: '#ef4444',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
