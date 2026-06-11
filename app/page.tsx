import { ConsentCard } from '@/components/home/ConsentCard';

export default function Home() {
  return (
    <div
      style={{
        background: '#0a0a0f',
        color: '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Glows */}
      <div
        style={{
          position: 'absolute',
          width: '50vw',
          height: '50vw',
          top: '-25vw',
          left: '-25vw',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '60vw',
          height: '60vw',
          bottom: '-30vw',
          right: '-30vw',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          zIndex: 1,
          width: '100%',
          maxWidth: '480px',
          textAlign: 'center',
        }}
      >
        {/* Logo and Header */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #f8fafc 30%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SIGNAL
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#94a3b8',
              fontWeight: 400,
              maxWidth: '380px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}
          >
            Consent-First Visitor Identity Enrichment Platform
          </p>
        </div>

        {/* Consent Form Card */}
        <ConsentCard />

        {/* Footer */}
        <footer style={{ marginTop: '16px', fontSize: '11px', color: '#475569' }}>
          Production-Grade • Full-Stack • AI-Powered • v1.0
        </footer>
      </main>
    </div>
  );
}
