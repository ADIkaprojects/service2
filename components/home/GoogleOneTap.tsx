'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

export function GoogleOneTap() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Avoid double prompts or loops if already resolved in this session
    const identityCompleted = localStorage.getItem('signal_identity_completed') === 'true';
    if (identityCompleted) return;

    const handleCredentialResponse = async (response: any) => {
      try {
        console.log('Received credential from Google One Tap');

        // 1. Resolve/Bootstrap active sessionId
        const urlParams = new URLSearchParams(window.location.search);
        let activeSessionId = urlParams.get('sessionId') || localStorage.getItem('signal_session_id');

        if (!activeSessionId) {
          console.log('No active session found. Bootstrapping new visitor session...');
          // Bootstrap a new session with default enrichment scopes
          const startRes = await fetch('/api/pipeline/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consentScopes: ['ip_enrichment', 'geolocation', 'email_discovery', 'company_enrichment', 'oauth'],
              jurisdictionHint: 'general',
              privacyPolicyVersion: 'v1.0',
            }),
          });

          if (!startRes.ok) {
            throw new Error('Failed to bootstrap new visitor session');
          }

          const startData = await startRes.json();
          activeSessionId = startData.data?.sessionId;
          if (activeSessionId) {
            localStorage.setItem('signal_session_id', activeSessionId);
          }
        }

        if (!activeSessionId) {
          throw new Error('Could not resolve or create active session ID');
        }

        // 2. Verify token on backend (passing the sessionId to associate)
        const verifyRes = await fetch('/api/auth/google-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            credential: response.credential,
            sessionId: activeSessionId,
          }),
        });

        if (!verifyRes.ok) {
          throw new Error('Failed to verify Google credential on server');
        }

        const verifyData = await verifyRes.json();
        if (!verifyData.success || !verifyData.data) {
          throw new Error('Invalid verification payload from server');
        }

        const { email, name } = verifyData.data;
        console.log('Successfully verified Google account:', email);

        // 3. Link identity to session and kick off enrichment pipeline
        const identityRes = await fetch('/api/pipeline/identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            type: 'oauth',
            oauthProvider: 'google',
            oauthEmail: email,
            oauthName: name,
          }),
        });

        if (!identityRes.ok) {
          throw new Error('Failed to ingest OAuth identity in pipeline');
        }

        // Keep track that we completed identification
        localStorage.setItem('signal_identity_completed', 'true');

        // Redirect to dashboard with the session ID
        router.push(`/analy?sessionId=${activeSessionId}`);
      } catch (err) {
        console.error('Google One Tap handler failed:', err);
      }
    };

    const initializeGoogleOneTap = () => {
      const google = (window as any).google;
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!google) {
        console.warn('Google SDK not available on window object');
        return;
      }

      if (!clientId) {
        // Mute logs in development unless it's configured, to avoid spamming console
        console.log('Google Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID) not configured. One Tap disabled.');
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      // Show the One Tap prompt
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.log('One Tap prompt is not displayed:', notification.getNotDisplayedReason());
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap prompt skipped:', notification.getSkippedReason());
        } else if (notification.isDismissedMoment()) {
          console.log('One Tap prompt dismissed:', notification.getDismissedReason());
        }
      });
    };

    // Load setup
    if ((window as any).google) {
      initializeGoogleOneTap();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google) {
          initializeGoogleOneTap();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [mounted, router]);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
    />
  );
}
