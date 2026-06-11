// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Redis pub/sub → SSE Bridge
//
// Publisher:  Workers call publishSSEEvent() to push events to Redis.
// Subscriber: The SSE route handler calls createSSEStream() to produce
//             a ReadableStream that subscribes to Redis and forwards events.
//
// Each IORedis subscriber connection is created per-stream (required by Redis
// pub/sub protocol — a subscriber connection cannot issue other commands).
// ─────────────────────────────────────────────────────────────────────────────

import IORedis from 'ioredis';
import type { SSEEventType } from '@/types/pipeline';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

// ── Channel helpers ─────────────────────────────────────────────────────────

export const SSE_CHANNEL_PREFIX = 'signal:sse:';

export function getSessionChannel(sessionId: string): string {
  return `${SSE_CHANNEL_PREFIX}${sessionId}`;
}

// ── Typed payload (matches types/pipeline.ts SSEPayload exactly) ─────────────

export interface SSEEventPayload<T = unknown> {
  event: SSEEventType;
  sessionId: string;
  timestamp: string; // ISO 8601
  data: T;
  sequenceNumber?: number;
}

// ── Publisher ────────────────────────────────────────────────────────────────
//
// Creates a short-lived Redis connection, publishes, then disconnects.
// Workers call this — do not keep a long-lived publisher per worker because
// each worker process shares the getRedisConnection() singleton for BullMQ.

export async function publishSSEEvent<T = unknown>(
  sessionId: string,
  event: SSEEventType,
  data: T,
  sequenceNumber?: number,
): Promise<void> {
  const publisher = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: false,
  });

  const payload: SSEEventPayload<T> = {
    event,
    sessionId,
    timestamp: new Date().toISOString(),
    data,
    ...(sequenceNumber !== undefined ? { sequenceNumber } : {}),
  };

  try {
    await publisher.publish(getSessionChannel(sessionId), JSON.stringify(payload));
  } finally {
    publisher.disconnect();
  }
}

// ── SSE ReadableStream factory ───────────────────────────────────────────────
//
// Used by the /api/pipeline/[sessionId]/stream route handler.
// The stream stays open until the pipeline_complete or pipeline_failed event
// is received, then auto-closes after a short grace period.

const TERMINAL_EVENTS = new Set<SSEEventType>(['pipeline_complete', 'pipeline_failed', 'error']);

export function createSSEStream(sessionId: string): ReadableStream<Uint8Array> {
  let subscriber: IORedis | null = null;
  const enc = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      subscriber = new IORedis(config.redis.url, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableReadyCheck: false,
      });

      const channel = getSessionChannel(sessionId);

      subscriber.subscribe(channel, (err) => {
        if (err) {
          logger.error({ err, sessionId }, 'SSE subscriber failed to subscribe');
          controller.error(err);
          return;
        }

        // Emit initial "connected" heartbeat so the browser doesn't buffer
        const connectPayload: SSEEventPayload = {
          event: 'pipeline_status',
          sessionId,
          timestamp: new Date().toISOString(),
          data: { connected: true },
        };
        controller.enqueue(enc.encode(`data: ${JSON.stringify(connectPayload)}\n\n`));
        logger.debug({ sessionId, channel }, 'SSE subscriber connected');
      });

      subscriber.on('message', (_ch: string, message: string) => {
        try {
          controller.enqueue(enc.encode(`data: ${message}\n\n`));

          // Parse to check if this is a terminal event
          const parsed = JSON.parse(message) as SSEEventPayload;
          if (TERMINAL_EVENTS.has(parsed.event)) {
            // Give the client 1 s to receive the final message, then close
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                // already closed
              }
            }, 1000);
          }
        } catch (parseErr) {
          logger.warn({ parseErr, sessionId }, 'Failed to parse SSE message');
        }
      });

      subscriber.on('error', (err: Error) => {
        logger.error({ err, sessionId }, 'SSE subscriber Redis error');
        controller.error(err);
      });
    },

    cancel() {
      if (subscriber) {
        subscriber.disconnect();
        subscriber = null;
      }
    },
  });
}

// ── Heartbeat helper ─────────────────────────────────────────────────────────
//
// Call this from the SSE route to keep long-lived connections alive through
// load-balancer / CDN idle timeouts (typically 30 s).

export async function publishHeartbeat(sessionId: string): Promise<void> {
  await publishSSEEvent(sessionId, 'heartbeat', { ping: true });
}
