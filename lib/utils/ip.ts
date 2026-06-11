// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — IP Extraction Utility
// ─────────────────────────────────────────────────────────────────────────────

import type { NextRequest } from 'next/server';

/**
 * Extract the real client IP address from a NextRequest.
 *
 * Priority:
 *  1. x-forwarded-for header (first entry, set by proxies/CDNs)
 *  2. x-real-ip header (set by Nginx, Vercel, etc.)
 *  3. Falls back to '127.0.0.1' when running locally without a proxy
 */
export function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Determine whether an IP address is a private/loopback address.
 * Used to gate expensive enrichment calls in local development.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

  // IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
  ];

  return privateRanges.some((r) => r.test(ip));
}
