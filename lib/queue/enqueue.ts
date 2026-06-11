// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Safe Enqueue Wrapper
//
// THIS IS THE ONLY FILE THAT SHOULD BE IMPORTED IN API ROUTES OR RSC.
// It never imports Worker code — only Queue clients.
// ─────────────────────────────────────────────────────────────────────────────

import type { JobType } from '@/types/pipeline';
import { getQueues, QUEUE_NAMES } from './queues';
import { logger } from '@/lib/logger';

// Map each job type to its BullMQ queue name
const JOB_TO_QUEUE: Record<JobType, string> = {
  ip_enrichment: QUEUE_NAMES.IP_ENRICHMENT,
  identity_lookup: QUEUE_NAMES.IDENTITY_LOOKUP,
  company_enrichment: QUEUE_NAMES.COMPANY_ENRICHMENT,
  domain_discovery: QUEUE_NAMES.DOMAIN_DISCOVERY,
  email_generation: QUEUE_NAMES.EMAIL_GENERATION,
  email_verification: QUEUE_NAMES.EMAIL_VERIFICATION,
};

export interface EnqueueOptions {
  priority?: number;
  delay?: number;
  jobId?: string;
}

/**
 * Adds a job to the appropriate BullMQ queue.
 *
 * @returns The BullMQ job ID
 */
export async function enqueueJob(
  jobType: JobType,
  data: Record<string, unknown>,
  options?: EnqueueOptions,
): Promise<string> {
  const queueName = JOB_TO_QUEUE[jobType];
  const queues = getQueues();
  const queue = queues[queueName];

  if (!queue) {
    throw new Error(`No queue found for job type: ${jobType}`);
  }

  const job = await queue.add(jobType, data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  logger.info(
    { jobType, jobId: job.id, sessionId: data['sessionId'], queueName },
    'Job enqueued',
  );

  return job.id!;
}
