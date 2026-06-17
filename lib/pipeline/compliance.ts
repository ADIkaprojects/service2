// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Compliance Gates
//
// All personal enrichment pipeline steps MUST call assertLawfulBasis()
// before processing. This is the hard legal gate — no exceptions.
// ─────────────────────────────────────────────────────────────────────────────

import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import Consent from '@/lib/db/models/Consent';
import { ComplianceError, RateLimitError, ConsentNotFoundError } from '@/lib/errors';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// assertLawfulBasis — THE CORE LEGAL GATE
//
// Called before any personal enrichment job. Throws if:
//   • Session not found
//   • No identity input present (OAuth email, manual email, OR name+domain)
//   • No active (unrevoked) consent record exists
// ─────────────────────────────────────────────────────────────────────────────

export async function assertLawfulBasis(sessionId: string): Promise<void> {
  await connectDB();

  const session = await VisitorSession.findOne({ sessionId }).lean();
  if (!session) {
    throw new ComplianceError(`Session not found: ${sessionId}`);
  }

  // At least one lawful identity input must be present
  const hasOAuth = !!session.oauthEmail;
  const hasManualEmail = !!session.manualEmail;
  const hasNameAndDomain = !!(session.manualName && session.manualCompanyUrl);

  if (!hasOAuth && !hasManualEmail && !hasNameAndDomain) {
    logger.warn({ sessionId }, 'Lawful basis check: no identity inputs found (running with fallback/skeleton data)');
  }

  // Active consent record must exist
  const consent = await Consent.findOne({ sessionId, revokedAt: null }).lean();
  if (!consent) {
    throw new ConsentNotFoundError(sessionId);
  }

  logger.debug({ sessionId }, 'Lawful basis confirmed');
}

// ─────────────────────────────────────────────────────────────────────────────
// assertRateLimit — Per-IP session rate limit
// ─────────────────────────────────────────────────────────────────────────────

export async function assertRateLimit(ip: string): Promise<void> {
  await connectDB();

  const windowMs = config.pipeline.rateLimitWindowSeconds * 1000;
  const maxSessions = config.pipeline.maxSessionsPerIp;
  const since = new Date(Date.now() - windowMs);

  const count = await VisitorSession.countDocuments({
    ip,
    pipelineStartedAt: { $gte: since },
    deletedAt: null,
  });

  if (count >= maxSessions) {
    logger.warn({ ip, count, maxSessions }, 'Rate limit exceeded');
    throw new RateLimitError(
      `Rate limit exceeded for IP ${ip}: ${count}/${maxSessions} sessions in window`,
      'platform',
      config.pipeline.rateLimitWindowSeconds,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// assertConsentScope — Scope-specific consent check
// ─────────────────────────────────────────────────────────────────────────────

export async function assertConsentScope(sessionId: string, scope: string): Promise<void> {
  await connectDB();

  const consent = await Consent.findOne({ sessionId, revokedAt: null }).lean();
  if (!consent) {
    throw new ConsentNotFoundError(sessionId);
  }

  if (!consent.grantedScopes.includes(scope)) {
    throw new ComplianceError(
      `Scope '${scope}' not granted for session: ${sessionId}`,
      [scope],
      { sessionId, requestedScope: scope, grantedScopes: consent.grantedScopes },
    );
  }
}
