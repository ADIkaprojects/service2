// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Pipeline Orchestrator
//
// Coordinates the enrichment pipeline by enqueueing BullMQ jobs in the
// correct order. This module is ONLY imported via API routes / enqueue helper
// — never directly in RSC or worker code.
// ─────────────────────────────────────────────────────────────────────────────

import { connectDB } from '@/lib/db/connect';
import { VisitorSession, PipelineJob } from '@/lib/db/models';
import { writeAuditLog } from '@/lib/utils/audit';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StartPipelineOptions {
  /** The SIGNAL session ID (not MongoDB _id). */
  sessionId: string;
  /** Resolved visitor IP, used for IP enrichment. */
  ip: string;
  /** Whether personal enrichment is permitted (consent + identity provided). */
  hasLawfulBasis: boolean;
}

export interface StartPipelineResult {
  queued: string[];
  skipped: string[];
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Starts the enrichment pipeline for a session.
 *
 * - Always queues `ip_enrichment` (anonymous, lawful-basis-free).
 * - Only queues personal enrichment jobs (`identity_lookup`, `company_enrichment`,
 *   `domain_discovery`, `email_generation`, `email_verification`) when
 *   `hasLawfulBasis` is true (consent record exists + identity signal captured).
 *
 * BullMQ job enqueueing is handled lazily via dynamic imports to keep this
 * module safe for use in the Next.js edge/Node API-route context.
 */
export async function startPipeline(
  options: StartPipelineOptions,
): Promise<StartPipelineResult> {
  const { sessionId, ip, hasLawfulBasis } = options;

  await connectDB();

  const session = await VisitorSession.findOne({ sessionId, deletedAt: null });
  if (!session) {
    throw new Error(`startPipeline: session not found for sessionId=${sessionId}`);
  }

  const queued: string[] = [];
  const skipped: string[] = [];

  const now = new Date();

  // ── 1. Create DB record and enqueue IP enrichment in BullMQ ────────────────
  await PipelineJob.create({
    sessionId,
    jobType: 'ip_enrichment',
    status: 'queued',
    inputData: { ip, hasLawfulBasis },
  });
  
  try {
    const { enqueueJob } = await import('@/lib/queue/enqueue');
    await enqueueJob('ip_enrichment', { sessionId, ip, hasLawfulBasis });
    queued.push('ip_enrichment');
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to enqueue ip_enrichment in BullMQ');
  }

  // ── 2. Personal enrichment — prepare DB records but do not enqueue in BullMQ yet
  const personalJobs = [
    'identity_lookup',
    'company_enrichment',
    'domain_discovery',
    'email_generation',
    'email_verification',
  ] as const;

  for (const jobType of personalJobs) {
    if (hasLawfulBasis) {
      await PipelineJob.create({
        sessionId,
        jobType,
        status: 'queued',
        inputData: { ip, hasLawfulBasis },
      });
      queued.push(jobType);
    } else {
      await PipelineJob.create({
        sessionId,
        jobType,
        status: 'skipped',
        inputData: { ip, hasLawfulBasis },
      });
      skipped.push(jobType);
    }
  }

  // ── 3. Update session pipeline state ───────────────────────────────────────
  await VisitorSession.updateOne(
    { sessionId },
    {
      $set: {
        pipelineStatus: 'ip_enriching',
        pipelineStartedAt: now,
      },
    },
  );

  // ── 4. Audit ────────────────────────────────────────────────────────────────
  await writeAuditLog({
    sessionId,
    action: 'pipeline_started',
    actor: 'system',
    details: { queued, skipped, hasLawfulBasis, ip },
  });

  logger.info({ sessionId, queued, skipped, hasLawfulBasis }, 'Pipeline started');

  return { queued, skipped };
}

