// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Snov.io Service Adapter
//
// Uses OAuth2 client credentials flow with in-process token caching.
//
// Provides:
//  - findEmailsByDomain()  — domain-level email discovery
//  - findEmailByName()     — person + domain → email address
//  - verifyEmail()         — SMTP-level email verification
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import { detectPatternFromExamples } from '../utils/email-patterns';
import type {
  ServiceResult,
  ServiceError,
  EmailPattern,
} from '@/types/pipeline';

const log = childLogger('snov');

const SNOV_API = 'https://api.snov.io';

// ── OAuth2 token cache ────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if it has >30 s of life left
  if (cachedToken && cachedToken.expiresAt - now > 30_000) {
    return cachedToken.token;
  }

  const clientId = config.services.snovClientId;
  const clientSecret = config.services.snovClientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('Snov.io client credentials not configured');
  }

  log.debug('Refreshing Snov.io access token');

  const res = await fetch(`${SNOV_API}/v1/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Snov.io token fetch failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error('Snov.io token response missing access_token');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };

  log.debug('Snov.io access token refreshed');
  return cachedToken.token;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(
  code: string,
  message: string,
  retryable: boolean,
  statusCode?: number,
): ServiceError {
  return { code, message, retryable, statusCode };
}

function guardKey(): boolean {
  return Boolean(config.services.snovClientId && config.services.snovClientSecret);
}

async function snovPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${SNOV_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Snov HTTP ${res.status}: ${text}`), {
      statusCode: res.status,
    });
  }

  return res.json() as Promise<T>;
}

// ── Raw API response shapes ───────────────────────────────────────────────────

interface SnovEmailEntry {
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  confidence?: number;
  status?: string;
}

interface SnovDomainEmailsResponse {
  success?: boolean;
  data?: SnovEmailEntry[];
  emails?: SnovEmailEntry[];
}

interface SnovEmailByNameResponse {
  success?: boolean;
  data?: Array<{
    email?: string;
    emailQuality?: number;
    confidence?: number;
  }>;
  emails?: Array<{
    email?: string;
    emailQuality?: number;
    confidence?: number;
  }>;
}

interface SnovVerifyResponse {
  success?: boolean;
  data?: {
    result?: string;
    isDeliverable?: boolean;
    deliverable?: boolean;
    confidence?: number;
  };
  result?: string;
  isDeliverable?: boolean;
  confidence?: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieve known email addresses and infer patterns for a domain.
 */
export async function findEmailsByDomain(
  domain: string,
): Promise<ServiceResult<{ emails: string[]; patterns: EmailPattern[] }>> {
  const start = Date.now();

  if (!guardKey()) {
    return {
      success: false,
      error: makeError('SERVICE_UNAVAILABLE', 'Snov.io credentials not configured', false),
      latencyMs: 0,
    };
  }

  try {
    log.debug({ domain }, 'Snov domain email search');

    const raw = await snovPost<SnovDomainEmailsResponse>('/v2/domain-emails-with-info', {
      domain,
      type: 'all',
      limit: 10,
    });

    const entries: SnovEmailEntry[] = raw.data ?? raw.emails ?? [];
    const emails = entries
      .map((e) => e.email ?? '')
      .filter((e) => e.includes('@'));

    // Build email examples for pattern detection (name fields vary by API version)
    const examples = entries
      .filter((e) => e.email && (e.firstName ?? e.first_name) && (e.lastName ?? e.last_name))
      .map((e) => ({
        email: e.email!,
        firstName: (e.firstName ?? e.first_name)!,
        lastName: (e.lastName ?? e.last_name)!,
      }));

    const dominant = detectPatternFromExamples(examples);
    const patterns: EmailPattern[] = dominant !== 'unknown' ? [dominant] : [];

    log.info({ domain, emailCount: emails.length, dominant }, 'Snov domain search complete');
    return { success: true, data: { emails, patterns }, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const statusCode = (err as { statusCode?: number }).statusCode;
    log.error({ domain, err }, 'Snov domain email search failed');
    return {
      success: false,
      error: makeError('SNOV_REQUEST_FAILED', message, true, statusCode),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Find the most likely email for a named person at a domain.
 */
export async function findEmailByName(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<ServiceResult<{ email: string; confidence: number }>> {
  const start = Date.now();

  if (!guardKey()) {
    return {
      success: false,
      error: makeError('SERVICE_UNAVAILABLE', 'Snov.io credentials not configured', false),
      latencyMs: 0,
    };
  }

  try {
    log.debug({ firstName, lastName, domain }, 'Snov email by name');

    const raw = await snovPost<SnovEmailByNameResponse>('/v1/email-by-name', {
      firstName,
      lastName,
      domain,
    });

    const entries = raw.data ?? raw.emails ?? [];
    const best = entries[0];

    if (!best?.email) {
      return {
        success: false,
        error: makeError('SNOV_NOT_FOUND', 'No email found for given name + domain', false),
        latencyMs: Date.now() - start,
      };
    }

    const confidence = (best.confidence ?? best.emailQuality ?? 0) / 100;

    log.info({ email: best.email, confidence }, 'Snov email by name: found');
    return {
      success: true,
      data: { email: best.email, confidence },
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const statusCode = (err as { statusCode?: number }).statusCode;
    log.error({ firstName, lastName, domain, err }, 'Snov email by name failed');
    return {
      success: false,
      error: makeError('SNOV_REQUEST_FAILED', message, true, statusCode),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Verify deliverability of a single email address via Snov.io.
 */
export async function verifyEmail(
  email: string,
): Promise<ServiceResult<{ isDeliverable: boolean; confidence: number }>> {
  const start = Date.now();

  if (!guardKey()) {
    return {
      success: false,
      error: makeError('SERVICE_UNAVAILABLE', 'Snov.io credentials not configured', false),
      latencyMs: 0,
    };
  }

  try {
    log.debug({ email }, 'Snov email verify');

    const raw = await snovPost<SnovVerifyResponse>('/v1/email-verifier', { email });

    // Snov may nest the result under .data or at the top level
    const result = raw.data?.result ?? raw.result ?? '';
    const isDeliverable =
      raw.data?.isDeliverable ??
      raw.data?.deliverable ??
      raw.isDeliverable ??
      result === 'deliverable';

    const confidence = raw.data?.confidence ?? raw.confidence ?? (isDeliverable ? 0.7 : 0.3);

    log.info({ email, isDeliverable, confidence }, 'Snov email verify complete');
    return {
      success: true,
      data: { isDeliverable, confidence },
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const statusCode = (err as { statusCode?: number }).statusCode;
    log.error({ email, err }, 'Snov email verify failed');
    return {
      success: false,
      error: makeError('SNOV_REQUEST_FAILED', message, true, statusCode),
      latencyMs: Date.now() - start,
    };
  }
}
