// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Nanoid Session ID Generator
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from 'nanoid';

/**
 * Generate a URL-safe, cryptographically random session ID.
 *
 * Uses 21 characters (nanoid default) which gives ~126 bits of entropy —
 * more than sufficient for collision resistance at any realistic scale.
 */
export function generateSessionId(): string {
  return nanoid(21);
}

/**
 * Generate a short correlation/request ID for log tracing.
 * Shorter (12 chars / ~72 bits) since it's only used within a single request.
 */
export function generateRequestId(): string {
  return nanoid(12);
}
