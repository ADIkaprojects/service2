// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — BullMQ Queue Registry
//
// All queues are lazily instantiated. This module is safe to import in
// Next.js API routes (it only creates Queue clients, never Workers).
// ─────────────────────────────────────────────────────────────────────────────

import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';

// ── Queue name constants ────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  IP_ENRICHMENT: 'ip-enrichment',
  IDENTITY_LOOKUP: 'identity-lookup',
  COMPANY_ENRICHMENT: 'company-enrichment',
  DOMAIN_DISCOVERY: 'domain-discovery',
  EMAIL_GENERATION: 'email-generation',
  EMAIL_VERIFICATION: 'email-verification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ── Default job options ─────────────────────────────────────────────────────

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// ── Factory ─────────────────────────────────────────────────────────────────

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions,
  });
}

// ── Lazy singleton registry ──────────────────────────────────────────────────
// Stored at module level but only constructed on first call to getQueues().
// This avoids top-level async initialisation and Next.js RSC build-time issues.

let _queues: Record<string, Queue> | null = null;

export function getQueues(): Record<string, Queue> {
  if (_queues) return _queues;

  _queues = {
    [QUEUE_NAMES.IP_ENRICHMENT]: createQueue(QUEUE_NAMES.IP_ENRICHMENT),
    [QUEUE_NAMES.IDENTITY_LOOKUP]: createQueue(QUEUE_NAMES.IDENTITY_LOOKUP),
    [QUEUE_NAMES.COMPANY_ENRICHMENT]: createQueue(QUEUE_NAMES.COMPANY_ENRICHMENT),
    [QUEUE_NAMES.DOMAIN_DISCOVERY]: createQueue(QUEUE_NAMES.DOMAIN_DISCOVERY),
    [QUEUE_NAMES.EMAIL_GENERATION]: createQueue(QUEUE_NAMES.EMAIL_GENERATION),
    [QUEUE_NAMES.EMAIL_VERIFICATION]: createQueue(QUEUE_NAMES.EMAIL_VERIFICATION),
  };

  return _queues;
}
