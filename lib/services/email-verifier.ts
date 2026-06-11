// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Email Verifier Service (Hunter + Snov.io Orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

import * as hunterService from './hunter';
import * as snovService from './snov';
import { scoreHunterFinder } from '../utils/confidence';
import type { VerificationResult, VerificationStatus } from '@/types/pipeline';
import { childLogger } from '../logger';

const log = childLogger('email-verifier');

export async function verifyEmail(email: string): Promise<VerificationResult> {
  const checkedAt = new Date();

  // Step 1: Try Hunter verify
  log.debug({ email }, 'Attempting Hunter verification');
  const hunterResult = await hunterService.verifyEmail(email);

  if (hunterResult.success) {
    const r = hunterResult.data;

    // Normal deliverable mailbox with no accept-all/catch-all behavior
    if (r.result === 'valid' && r.smtpCheck && !r.acceptAll) {
      return {
        email,
        status: 'valid',
        score: scoreHunterFinder(r.score),
        provider: 'hunter',
        checkedAt,
        raw: r as unknown as Record<string, unknown>,
      };
    }

    if (r.result === 'invalid') {
      return {
        email,
        status: 'invalid',
        score: 0,
        provider: 'hunter',
        checkedAt,
        raw: r as unknown as Record<string, unknown>,
      };
    }

    if (r.result === 'risky') {
      return {
        email,
        status: 'risky',
        score: 0.4,
        provider: 'hunter',
        checkedAt,
        raw: r as unknown as Record<string, unknown>,
      };
    }

    if (r.acceptAll) {
      // Catch-all: Get Snov.io second opinion
      log.debug({ email }, 'Hunter returned acceptAll, querying Snov.io fallback');
      try {
        const snovResult = await snovService.verifyEmail(email);
        if (snovResult.success && snovResult.data.isDeliverable) {
          return {
            email,
            status: 'catch_all',
            score: 0.55,
            provider: 'hunter', // Maps to valid provider string
            checkedAt,
            raw: { hunter: r, snov: snovResult.data },
          };
        }
      } catch (err) {
        log.warn({ email, err }, 'Snov fallback failed during catch-all verification');
      }

      return {
        email,
        status: 'catch_all',
        score: 0.45,
        provider: 'hunter',
        checkedAt,
        raw: r as unknown as Record<string, unknown>,
      };
    }
  }

  // Step 2: Try Snov fallback directly if Hunter failed/unavailable
  log.debug({ email }, 'Hunter verification failed or was unavailable, attempting Snov');
  try {
    const snovResult = await snovService.verifyEmail(email);
    if (snovResult.success) {
      const isDeliv = snovResult.data.isDeliverable;
      return {
        email,
        status: isDeliv ? 'valid' : 'unknown',
        score: snovResult.data.confidence,
        provider: 'internal', // Snov matches internal/custom fallback here
        checkedAt,
        raw: snovResult.data as unknown as Record<string, unknown>,
      };
    }
  } catch (err) {
    log.error({ email, err }, 'Snov fallback verification failed as well');
  }

  // Fallback of last resort
  return {
    email,
    status: 'unknown',
    score: 0.15,
    provider: 'internal',
    checkedAt,
    raw: { error: 'All verifiers failed' },
  };
}
