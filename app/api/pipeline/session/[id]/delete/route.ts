// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — GDPR Erasure Endpoint (Session Delete API)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import { writeAuditLog } from '@/lib/utils/audit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const session = await VisitorSession.findOne({ sessionId: id });
    if (!session) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' }, requestId: id },
        { status: 404 }
      );
    }

    // Capture old IP for logging prior to erasure
    const oldIp = session.ip;

    // GDPR Erasure: set all PII fields to null and set deletedAt
    session.oauthEmail = undefined;
    session.oauthName = undefined;
    session.manualEmail = undefined;
    session.manualName = undefined;
    session.manualCompanyUrl = undefined;
    session.ip = undefined;
    session.deletedAt = new Date();
    await session.save();

    // Write audit log
    await writeAuditLog({
      sessionId: id,
      action: 'gdpr_erasure',
      actor: 'user',
      details: { erasedFields: ['oauthEmail', 'oauthName', 'manualEmail', 'manualName', 'manualCompanyUrl', 'ip'] },
      ip: oldIp,
    });

    return Response.json({
      success: true,
      data: { sessionId: id, erased: true },
      requestId: id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during GDPR erasure';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId: 'unknown' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
