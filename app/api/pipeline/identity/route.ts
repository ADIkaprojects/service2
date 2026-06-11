// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Identity Ingestion & Pipeline Orchestration Trigger API
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import RawSignal from '@/lib/db/models/RawSignal';
import { extractIp } from '@/lib/utils/ip';
import { startPipeline } from '@/lib/pipeline/orchestrator';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      type,
      oauthProvider,
      oauthEmail,
      oauthName,
      manualEmail,
      manualName,
      manualCompanyUrl,
    } = body;

    if (!sessionId || !type) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'sessionId and type are required' }, requestId: 'unknown' },
        { status: 400 }
      );
    }

    const session = await VisitorSession.findOne({ sessionId });
    if (!session) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' }, requestId: sessionId },
        { status: 404 }
      );
    }

    const collectedAt = new Date();
    const extractedIp = extractIp(req);

    if (type === 'oauth') {
      session.oauthProvider = oauthProvider;
      session.oauthEmail = oauthEmail;
      session.oauthName = oauthName;

      await RawSignal.create({
        sessionId,
        signalType: 'oauth',
        rawPayload: { oauthProvider, oauthEmail, oauthName },
        collectedAt,
      });
    } else if (type === 'manual') {
      session.manualEmail = manualEmail;
      session.manualName = manualName;
      session.manualCompanyUrl = manualCompanyUrl;

      await RawSignal.create({
        sessionId,
        signalType: 'manual',
        rawPayload: { manualEmail, manualName, manualCompanyUrl },
        collectedAt,
      });
    } else {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid identity type' }, requestId: sessionId },
        { status: 400 }
      );
    }

    session.lawfulBasisEstablished = true;
    await session.save();

    // Trigger pipeline start with lawful basis set to true
    await startPipeline({
      sessionId,
      ip: extractedIp,
      hasLawfulBasis: true,
    });

    return Response.json({
      success: true,
      data: { sessionId, pipelineStarted: true },
      requestId: sessionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during identity ingestion';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId: 'unknown' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
