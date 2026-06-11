// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Pino Logger
//
// Singleton logger instance shared across the server runtime.
// pino and pino-pretty are automatically excluded from bundling by Next.js
// (they are in the built-in serverExternalPackages list).
// ─────────────────────────────────────────────────────────────────────────────

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Create a child logger bound to a specific module / context.
 *
 * @example
 * const log = childLogger('ip-enrichment');
 * log.info({ sessionId }, 'Enriching IP');
 */
export function childLogger(module: string, bindings?: Record<string, unknown>): pino.Logger {
  return logger.child({ module, ...bindings });
}
