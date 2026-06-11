// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Hunter.io Service Adapter
//
// Provides:
//  - domainSearch()   — lists known emails / pattern for a domain
//  - emailFinder()    — finds a specific person's email
//  - verifyEmail()    — verifies a single email address
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import {
  detectPatternFromExamples,
  type EmailExample,
} from '../utils/email-patterns';
import type {
  ServiceResult,
  ServiceError,
  HunterDomainSearchResult,
  HunterDomainSearchEmail,
  HunterEmailFinderResult,
  HunterVerifyResult,
  EmailPattern,
  VerificationStatus,
} from '@/types/pipeline';

const log = childLogger('hunter');

const HUNTER_BASE = 'https://api.hunter.io/v2';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(
  code: string,
  message: string,
  retryable: boolean,
  statusCode?: number,
): ServiceError {
  return { code, message, retryable, statusCode };
}

function unavailableError(): ServiceError {
  return makeError('SERVICE_UNAVAILABLE', 'Hunter API key not configured', false);
}

/** Check key and return early with a typed failure if absent. */
function guardKey(): string | null {
  const key = config.services.hunter;
  return key || null;
}

// ── Raw API shape helpers ─────────────────────────────────────────────────────

interface HunterSourceRaw {
  domain: string;
  uri: string;
  extracted_on: string;
  still_on_page: boolean;
}

interface HunterEmailRaw {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  sources: HunterSourceRaw[];
  first_name?: string;
  last_name?: string;
  position?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phone_number?: string;
  verification?: { date: string | null; status: string };
}

interface HunterDomainSearchRaw {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  accept_all: boolean;
  pattern: string;
  organization: string;
  country?: string;
  state?: string;
  emails: HunterEmailRaw[];
  meta: { results: number; total: number };
}

interface HunterFinderRaw {
  email: string;
  score: number;
  domain: string;
  accept_all: boolean;
  position?: string;
  twitter?: string;
  linkedin_url?: string;
  phone_number?: string;
  company?: string;
  first_name: string;
  last_name: string;
  sources: HunterSourceRaw[];
  verification?: { date: string | null; status: string };
}

interface HunterVerifyRaw {
  email: string;
  result: string;
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  block: boolean;
  sources: HunterSourceRaw[];
}

// ── Normalisers ───────────────────────────────────────────────────────────────

function normaliseSources(
  raw: HunterSourceRaw[],
): HunterDomainSearchEmail['sources'] {
  return (raw ?? []).map((s) => ({
    domain: s.domain,
    uri: s.uri,
    extractedOn: s.extracted_on,
    stillOnPage: s.still_on_page,
  }));
}

function normaliseEmail(raw: HunterEmailRaw): HunterDomainSearchEmail {
  return {
    value: raw.value,
    type: raw.type,
    confidence: raw.confidence,
    sources: normaliseSources(raw.sources ?? []),
    firstName: raw.first_name,
    lastName: raw.last_name,
    position: raw.position,
    seniority: raw.seniority,
    department: raw.department,
    linkedinUrl: raw.linkedin,
    twitterHandle: raw.twitter,
    phoneNumber: raw.phone_number,
    verification: raw.verification
      ? { date: raw.verification.date, status: raw.verification.status as VerificationStatus }
      : undefined,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search all known email addresses for a given domain.
 */
export async function domainSearch(
  domain: string,
): Promise<ServiceResult<HunterDomainSearchResult>> {
  const start = Date.now();
  const key = guardKey();

  if (!key) {
    return { success: false, error: unavailableError(), latencyMs: 0 };
  }

  try {
    log.debug({ domain }, 'Hunter domain search');

    const url = `${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { errors?: Array<{ details: string }> };
      const message = body.errors?.[0]?.details ?? `HTTP ${res.status}`;
      return {
        success: false,
        error: makeError('HUNTER_HTTP_ERROR', message, res.status >= 500, res.status),
        latencyMs: Date.now() - start,
      };
    }

    const body = (await res.json()) as { data: HunterDomainSearchRaw };
    const raw = body.data;

    // Build EmailExample array for pattern detection
    const examples: EmailExample[] = (raw.emails ?? [])
      .filter((e) => e.first_name && e.last_name)
      .map((e) => ({
        email: e.value,
        firstName: e.first_name!,
        lastName: e.last_name!,
      }));

    const detectedPattern = detectPatternFromExamples(examples);
    const apiPattern = (raw.pattern ?? 'unknown') as EmailPattern;

    // Prefer API-reported pattern when it's known; fall back to our detection
    const pattern: EmailPattern =
      apiPattern !== 'unknown' ? apiPattern : detectedPattern;

    const data: HunterDomainSearchResult = {
      domain: raw.domain,
      disposable: raw.disposable,
      webmail: raw.webmail,
      acceptAll: raw.accept_all,
      pattern,
      organization: raw.organization,
      country: raw.country,
      state: raw.state,
      emails: (raw.emails ?? []).map(normaliseEmail),
      metaResults: raw.meta?.results ?? 0,
      metaTotal: raw.meta?.total ?? 0,
    };

    log.info({ domain, emailCount: data.emails.length, pattern }, 'Hunter domain search complete');
    return { success: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ domain, err }, 'Hunter domain search failed');
    return {
      success: false,
      error: makeError('HUNTER_REQUEST_FAILED', message, true),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Find the most likely email address for a specific person at a domain.
 * Returns `{ success: false }` when the score is below 30 or no email found.
 */
export async function emailFinder(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<ServiceResult<HunterEmailFinderResult> | { success: false; error: ServiceError }> {
  const start = Date.now();
  const key = guardKey();

  if (!key) {
    return { success: false, error: unavailableError() };
  }

  try {
    log.debug({ firstName, lastName, domain }, 'Hunter email finder');

    const url =
      `${HUNTER_BASE}/email-finder` +
      `?domain=${encodeURIComponent(domain)}` +
      `&first_name=${encodeURIComponent(firstName)}` +
      `&last_name=${encodeURIComponent(lastName)}` +
      `&api_key=${key}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { errors?: Array<{ details: string }> };
      const message = body.errors?.[0]?.details ?? `HTTP ${res.status}`;
      return {
        success: false,
        error: makeError('HUNTER_HTTP_ERROR', message, res.status >= 500, res.status),
        latencyMs: Date.now() - start,
      };
    }

    const body = (await res.json()) as { data: HunterFinderRaw };
    const raw = body.data;

    if (!raw.email || raw.score < 30) {
      log.info({ firstName, lastName, domain, score: raw.score }, 'Hunter email finder: low confidence, skipping');
      return {
        success: false,
        error: makeError('HUNTER_LOW_CONFIDENCE', `Score ${raw.score} below threshold`, false),
      };
    }

    const data: HunterEmailFinderResult = {
      email: raw.email,
      score: raw.score,
      domain: raw.domain,
      acceptAll: raw.accept_all,
      position: raw.position,
      twitter: raw.twitter,
      linkedinUrl: raw.linkedin_url,
      phoneNumber: raw.phone_number,
      company: raw.company,
      firstName: raw.first_name,
      lastName: raw.last_name,
      sources: normaliseSources(raw.sources ?? []),
      verification: raw.verification
        ? { date: raw.verification.date, status: raw.verification.status as VerificationStatus }
        : undefined,
    };

    log.info({ email: data.email, score: data.score }, 'Hunter email finder: found');
    return { success: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ firstName, lastName, domain, err }, 'Hunter email finder failed');
    return {
      success: false,
      error: makeError('HUNTER_REQUEST_FAILED', message, true),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Verify a single email address using Hunter's email verifier.
 * Never throws — returns `{ success: false }` on any error.
 */
export async function verifyEmail(
  email: string,
): Promise<ServiceResult<HunterVerifyResult>> {
  const start = Date.now();
  const key = guardKey();

  if (!key) {
    return { success: false, error: unavailableError(), latencyMs: 0 };
  }

  try {
    log.debug({ email }, 'Hunter email verify');

    const url = `${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { errors?: Array<{ details: string }> };
      const message = body.errors?.[0]?.details ?? `HTTP ${res.status}`;
      return {
        success: false,
        error: makeError('HUNTER_HTTP_ERROR', message, res.status >= 500, res.status),
        latencyMs: Date.now() - start,
      };
    }

    const body = (await res.json()) as { data: HunterVerifyRaw };
    const raw = body.data;

    const data: HunterVerifyResult = {
      email: raw.email,
      result: raw.result as VerificationStatus,
      score: raw.score,
      regexp: raw.regexp,
      gibberish: raw.gibberish,
      disposable: raw.disposable,
      webmail: raw.webmail,
      mxRecords: raw.mx_records,
      smtpServer: raw.smtp_server,
      smtpCheck: raw.smtp_check,
      acceptAll: raw.accept_all,
      block: raw.block,
      sources: normaliseSources(raw.sources ?? []),
    };

    log.info({ email, result: data.result, score: data.score }, 'Hunter email verify complete');
    return { success: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.warn({ email, err }, 'Hunter email verify failed (non-throwing)');
    return {
      success: false,
      error: makeError('HUNTER_REQUEST_FAILED', message, true),
      latencyMs: Date.now() - start,
    };
  }
}
