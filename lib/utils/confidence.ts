// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Confidence Scoring Engine
//
// Produces a normalised 0–1 confidence score for email candidates based on
// the source of the data (Hunter finder score, verified status, pattern match,
// catch-all detection, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import type { VerificationStatus, EmailPattern, GeneratedCandidate } from '@/types/pipeline';

// ─────────────────────────────────────────────────────────────────────────────
// Base confidence values — starting points before adjustments
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_CONFIDENCE = {
  /** Email returned by Hunter's /email-finder endpoint with pattern match */
  hunterFinder: 0.65,
  /** Email found in Hunter domain search results (already seen on the web) */
  hunterDomainSearch: 0.70,
  /** Email generated from a detected domain pattern, not yet verified */
  patternGenerated: 0.45,
  /** Email suggested by the Mistral LLM without a confirmed pattern */
  llmInference: 0.30,
  /** Email confirmed valid by SMTP check */
  smtpVerified: 0.90,
  /** Catch-all domain (SMTP check always passes — uncertain) */
  catchAll: 0.55,
  /** Email verified as invalid */
  invalid: 0.00,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pattern reliability weights (multiplicative adjustment on base score)
// ─────────────────────────────────────────────────────────────────────────────

const PATTERN_WEIGHT: Record<EmailPattern, number> = {
  'first.last':    1.00,
  'f.last':        0.98,
  'flast':         0.95,
  'firstlast':     0.93,
  'first_last':    0.97,
  'first-last':    0.96,
  'last.first':    0.92,
  'lastfirst':     0.90,
  'firstname.l':   0.88,
  'f.lastname':    0.87,
  'first':         0.80,
  'last':          0.75,
  'initials':      0.70,
  'unknown':       0.50,
};

// ─────────────────────────────────────────────────────────────────────────────
// Verification status adjustments (additive, applied after pattern weight)
// ─────────────────────────────────────────────────────────────────────────────

const VERIFICATION_ADJUSTMENT: Record<VerificationStatus, number> = {
  valid:     +0.25,
  catch_all: -0.10,
  risky:     -0.15,
  unknown:   -0.05,
  invalid:   -1.00, // effectively zeroes out
  pending:   +0.00,
  running:   +0.00,
  error:     -0.05,
};

// ─────────────────────────────────────────────────────────────────────────────
// Public scoring functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a Hunter email-finder result.
 *
 * @param hunterScore  Raw Hunter confidence score (0–100)
 * @param verifyStatus Optional verification status for additional adjustment
 */
export function scoreHunterFinder(
  hunterScore: number,
  verifyStatus?: VerificationStatus,
): number {
  // Hunter returns 0–100; normalise then blend with base
  const normalised = Math.min(hunterScore, 100) / 100;
  const blended = BASE_CONFIDENCE.hunterFinder * 0.4 + normalised * 0.6;

  const adjustment = verifyStatus ? VERIFICATION_ADJUSTMENT[verifyStatus] : 0;
  return clamp(blended + adjustment);
}

/**
 * Score a generated email candidate.
 *
 * @param pattern       The email pattern used to generate the address
 * @param verifyStatus  Verification result status
 * @param verifyScore   Raw verifier score (0–100) if available
 * @param source        Where this candidate originated
 */
export function scoreGeneratedCandidate(
  pattern: EmailPattern,
  verifyStatus: VerificationStatus,
  verifyScore?: number,
  source?: GeneratedCandidate['source'],
): number {
  // Choose base according to source
  let base: number;
  switch (source) {
    case 'domain_search':
      base = BASE_CONFIDENCE.hunterDomainSearch;
      break;
    case 'direct_lookup':
      base = BASE_CONFIDENCE.hunterFinder;
      break;
    case 'llm_inference':
      base = BASE_CONFIDENCE.llmInference;
      break;
    default:
      base = BASE_CONFIDENCE.patternGenerated;
  }

  // Apply pattern weight
  const patternWeight = PATTERN_WEIGHT[pattern];
  const weighted = base * patternWeight;

  // Apply verification adjustment
  const adjustment = VERIFICATION_ADJUSTMENT[verifyStatus];

  // If the verifier returned an explicit score, blend it in
  if (verifyScore !== undefined) {
    const normVerify = Math.min(verifyScore, 100) / 100;
    const blended = weighted * 0.5 + normVerify * 0.5;
    return clamp(blended + adjustment);
  }

  return clamp(weighted + adjustment);
}

// ─────────────────────────────────────────────────────────────────────────────
// Label helpers
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceLabel = 'high' | 'medium' | 'low' | 'very_low';

/**
 * Map a 0–1 confidence score to a human-readable label.
 */
export function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 0.75) return 'high';
  if (score >= 0.55) return 'medium';
  if (score >= 0.35) return 'low';
  return 'very_low';
}

/**
 * Map a 0–1 confidence score to a Tailwind-compatible colour token.
 * Used for badge/chip rendering in the dashboard.
 */
export function confidenceColor(score: number): string {
  switch (confidenceLabel(score)) {
    case 'high':     return 'green';
    case 'medium':   return 'yellow';
    case 'low':      return 'orange';
    case 'very_low': return 'red';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
