// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Consent Ingestion & Session Bootstrap API
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import Consent from '@/lib/db/models/Consent';
import { extractIp } from '@/lib/utils/ip';
import { generateSessionId } from '@/lib/utils/nanoid';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { consentScopes = [], jurisdictionHint = 'general', privacyPolicyVersion = 'v1.0' } = body;

    const ip = extractIp(req);
    const userAgent = req.headers.get('user-agent') || undefined;
    const language = req.headers.get('accept-language')?.split(',')[0] || undefined;
    const landingUrl = req.headers.get('referer') || undefined;

    const sessionId = generateSessionId();

    // Create session in 'created' state
    const session = await VisitorSession.create({
      sessionId,
      ip,
      userAgent,
      language,
      landingUrl,
      pipelineStatus: 'created',
      lawfulBasisEstablished: false,
    });

    // Create consent record
    await Consent.create({
      sessionId,
      consentTextVersion: config.pipeline.consentTextVersion || 'v1.0',
      grantedScopes: consentScopes,
      ip,
      userAgent,
      jurisdictionHint,
      privacyPolicyVersion,
      timestamp: new Date(),
    });

    // Update status to 'consent_stored'
    session.pipelineStatus = 'consent_stored';
    await session.save();

    return Response.json({
      success: true,
      data: { sessionId },
      requestId: sessionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during session start';
    return Response.json(
      {
        success: false,
        error: { code: 'BOOTSTRAP_FAILED', message },
        requestId: 'unknown',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
