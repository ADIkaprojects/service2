// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Email Pattern Utilities
//
// Detects corporate email patterns from example addresses, generates
// candidate addresses from a known pattern, and extracts raw email addresses
// from unstructured text.
// ─────────────────────────────────────────────────────────────────────────────

import type { EmailPattern } from '@/types/pipeline';

// ─────────────────────────────────────────────────────────────────────────────
// Pattern detectors
//
// Each entry maps an EmailPattern to a function that tests whether a given
// (localPart, firstName, lastName) triple matches that pattern.
// ─────────────────────────────────────────────────────────────────────────────

type PatternMatcher = (local: string, first: string, last: string) => boolean;

const PATTERN_MATCHERS: Array<[EmailPattern, PatternMatcher]> = [
  ['first.last',   (l, f, n) => l === `${f}.${n}`],
  ['last.first',   (l, f, n) => l === `${n}.${f}`],
  ['f.last',       (l, f, n) => l === `${f[0]}.${n}`],
  ['f.lastname',   (l, f, n) => l === `${f[0]}.${n}`],   // alias
  ['firstname.l',  (l, f, n) => l === `${f}.${n[0]}`],
  ['flast',        (l, f, n) => l === `${f[0]}${n}`],
  ['firstlast',    (l, f, n) => l === `${f}${n}`],
  ['lastfirst',    (l, f, n) => l === `${n}${f}`],
  ['first_last',   (l, f, n) => l === `${f}_${n}`],
  ['first-last',   (l, f, n) => l === `${f}-${n}`],
  ['first',        (l, f)    => l === f],
  ['last',         (l, f, n) => l === n],
  ['initials',     (l, f, n) => l === `${f[0]}${n[0]}`],
];

// ─────────────────────────────────────────────────────────────────────────────
// Pattern detection from example emails
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailExample {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Infer the dominant email pattern for a domain given a set of known
 * (email, firstName, lastName) triples.
 *
 * Returns `'unknown'` when no pattern can be determined with confidence.
 */
export function detectPatternFromExamples(examples: EmailExample[]): EmailPattern {
  if (examples.length === 0) return 'unknown';

  const votes = new Map<EmailPattern, number>();

  for (const { email, firstName, lastName } of examples) {
    const at = email.indexOf('@');
    if (at === -1) continue;

    const local = email.slice(0, at).toLowerCase();
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last  = lastName.toLowerCase().replace(/[^a-z]/g, '');

    if (!first || !last) continue;

    for (const [pattern, matcher] of PATTERN_MATCHERS) {
      if (matcher(local, first, last)) {
        votes.set(pattern, (votes.get(pattern) ?? 0) + 1);
        break; // one pattern per example
      }
    }
  }

  if (votes.size === 0) return 'unknown';

  // Pick the pattern with the most votes; ties broken by order in PATTERN_MATCHERS
  let bestPattern: EmailPattern = 'unknown';
  let bestCount = 0;

  for (const [pattern, count] of votes) {
    if (count > bestCount) {
      bestPattern = pattern;
      bestCount = count;
    }
  }

  // Require at least 50 % agreement for multi-example sets
  if (examples.length >= 3 && bestCount / examples.length < 0.5) {
    return 'unknown';
  }

  return bestPattern;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate generation from a known pattern
// ─────────────────────────────────────────────────────────────────────────────

export interface NameTokens {
  firstName: string;
  lastName: string;
  middleName?: string;
}

/**
 * Generate all email address candidates for a given name + domain + pattern.
 *
 * When `pattern` is `'unknown'`, all known patterns are tried and a full set
 * of candidates is returned.
 */
export function generateCandidatesFromPattern(
  name: NameTokens,
  domain: string,
  pattern: EmailPattern,
): string[] {
  const first = name.firstName.toLowerCase().replace(/[^a-z]/g, '');
  const last  = name.lastName.toLowerCase().replace(/[^a-z]/g, '');

  if (!first || !last || !domain) return [];

  const f0 = first[0];
  const l0 = last[0];

  const allLocals: Record<EmailPattern, string> = {
    'first.last':   `${first}.${last}`,
    'last.first':   `${last}.${first}`,
    'f.last':       `${f0}.${last}`,
    'f.lastname':   `${f0}.${last}`,
    'firstname.l':  `${first}.${l0}`,
    'flast':        `${f0}${last}`,
    'firstlast':    `${first}${last}`,
    'lastfirst':    `${last}${first}`,
    'first_last':   `${first}_${last}`,
    'first-last':   `${first}-${last}`,
    'first':        first,
    'last':         last,
    'initials':     `${f0}${l0}`,
    'unknown':      '', // handled below
  };

  const safeDomain = domain.toLowerCase().trim();

  if (pattern === 'unknown') {
    // Return one candidate per pattern (except 'unknown' and 'f.lastname' which
    // duplicates 'f.last')
    const seen = new Set<string>();
    const results: string[] = [];

    for (const [p, local] of Object.entries(allLocals) as Array<[EmailPattern, string]>) {
      if (p === 'unknown' || p === 'f.lastname') continue;
      if (!local) continue;
      const email = `${local}@${safeDomain}`;
      if (!seen.has(email)) {
        seen.add(email);
        results.push(email);
      }
    }
    return results;
  }

  const local = allLocals[pattern];
  if (!local) return [];
  return [`${local}@${safeDomain}`];
}

// ─────────────────────────────────────────────────────────────────────────────
// Email extraction from unstructured text
// ─────────────────────────────────────────────────────────────────────────────

// RFC 5322-ish pattern; intentionally permissive for scraping purposes
const EMAIL_REGEX = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

/**
 * Extract all email-like strings from a block of text.
 * Deduplicates and lowercases results.
 */
export function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  const unique = new Set(matches.map((m) => m.toLowerCase()));
  return Array.from(unique);
}
