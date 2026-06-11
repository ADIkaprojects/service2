// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Anonymous Pipeline Trigger API (IP Enrichment Only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import { extractIp } from '@/lib/utils/ip';
import { startPipeline } from '@/lib/pipeline/orchestrator';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' }, requestId: 'unknown' },
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

    const extractedIp = extractIp(req);

    // Trigger pipeline start with hasLawfulBasis set to false (anonymous IP lookup only)
    await startPipeline({
      sessionId,
      ip: extractedIp,
      hasLawfulBasis: false,
    });

    return Response.json({
      success: true,
      data: { sessionId },
      requestId: sessionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during anonymous pipeline start';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId: 'unknown' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
