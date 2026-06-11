// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — IORedis Singleton
//
// A single Redis connection re-used by all BullMQ queues and workers.
// Stored on `global` to survive Next.js hot-reloads in development.
// ─────────────────────────────────────────────────────────────────────────────

import IORedis from 'ioredis';
import { config } from '@/lib/config';

declare global {
  // eslint-disable-next-line no-var
  var _ioredis: IORedis | undefined;
}

export function getRedisConnection(): any {
  if (global._ioredis) return global._ioredis;

  global._ioredis = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  return global._ioredis;
}
