// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Audit Log Writer
//
// Provides async helpers that persist an immutable audit trail to MongoDB.
// All pipeline actions that touch personal data MUST call these functions so
// there is a durable record for compliance review.
//
// Audit write failures are NEVER re-thrown — they are logged at error level
// so ops can investigate, but they must not abort the pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import { connectDB } from '@/lib/db/connect';
import AuditLog, { type AuditActor } from '@/lib/db/models/AuditLog';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'utils/audit' });

export interface WriteAuditLogParams {
  sessionId?: string;
  action: string;
  actor: AuditActor;
  details?: Record<string, unknown>;
  ip?: string;
}

/**
 * Write a single audit log entry to MongoDB.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      sessionId: params.sessionId,
      action: params.action,
      actor: params.actor,
      details: params.details,
      ip: params.ip,
      timestamp: new Date(),
    });
  } catch (err) {
    // Audit log failures MUST NOT crash the pipeline
    log.error(
      { err, action: params.action, sessionId: params.sessionId },
      'Failed to write audit log',
    );
  }
}

/**
 * Write multiple audit log entries in a single MongoDB insertMany operation.
 * Preferred for batched operations where several actions happen together.
 */
export async function writeAuditLogs(entries: WriteAuditLogParams[]): Promise<void> {
  if (entries.length === 0) return;

  try {
    await connectDB();
    await AuditLog.insertMany(
      entries.map((params) => ({
        sessionId: params.sessionId,
        action: params.action,
        actor: params.actor,
        details: params.details,
        ip: params.ip,
        timestamp: new Date(),
      })),
      { ordered: false },
    );
  } catch (err) {
    log.error({ err, count: entries.length }, 'Failed to write batch audit logs');
  }
}
