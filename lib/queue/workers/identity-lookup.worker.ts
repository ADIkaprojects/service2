// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Identity Lookup Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import IdentityCandidate from '../../db/models/IdentityCandidate';
import { assertLawfulBasis } from '../../pipeline/compliance';
import { publishSSEEvent } from '../../pipeline/sse';
import { enqueueJob } from '../enqueue';
import { writeAuditLog } from '../../utils/audit';
import { logger } from '../../logger';
import { parseName } from '../../utils/name-parser';
import * as apolloService from '../../services/apollo';
import * as hunterService from '../../services/hunter';
import * as snovService from '../../services/snov';
import { scoreHunterFinder } from '../../utils/confidence';

const worker = new Worker(
  'identity-lookup',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const start = Date.now();
    await connectDB();

    // Update job status to running
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'identity_lookup' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'identity_lookup' });

    try {
      // Gate 1: Check compliance/lawful basis
      await assertLawfulBasis(sessionId);
    } catch (complianceErr) {
      const msg = complianceErr instanceof Error ? complianceErr.message : 'Compliance validation failed';
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'identity_lookup' },
        { status: 'failed', completedAt: new Date(), errorMessage: msg }
      );
      // Skip all remaining jobs
      await PipelineJob.updateMany(
        {
          sessionId,
          jobType: { $in: ['company_enrichment', 'domain_discovery', 'email_generation', 'email_verification'] }
        },
        { status: 'skipped' }
      );
      await VisitorSession.findOneAndUpdate(
        { sessionId },
        { pipelineStatus: 'failed', pipelineCompletedAt: new Date() }
      );
      await publishSSEEvent(sessionId, 'pipeline_failed', { error: msg });
      return;
    }

    const session = await VisitorSession.findOne({ sessionId });
    if (!session) {
      logger.error({ sessionId }, 'Session not found in identity lookup worker');
      return;
    }

    let resolvedName = '';
    let resolvedEmail = '';
    let companyName = session.resolvedCompanyName || '';
    let companyDomain = session.resolvedCompanyDomain || '';

    // If manual entry details are present, let's use companyName/domain if not resolved yet
    if (session.manualCompanyUrl) {
      try {
        const url = new URL(session.manualCompanyUrl.startsWith('http') ? session.manualCompanyUrl : `https://${session.manualCompanyUrl}`);
        companyDomain = url.hostname.replace('www.', '');
      } catch {
        companyDomain = session.manualCompanyUrl;
      }
    }

    let matchSource: 'oauth' | 'apollo' | 'hunter' | 'snov' | null = null;
    let matchDetail: any = null;

    // Cascade 1: OAuth Token Input
    if (session.oauthEmail) {
      resolvedEmail = session.oauthEmail;
      resolvedName = session.oauthName || '';
      matchSource = 'oauth';
      matchDetail = { email: session.oauthEmail, name: session.oauthName };
    }

    // Cascade 2: Apollo People Match (requires name and company name/domain)
    const personNameStr = session.oauthName || session.manualName;
    if (!matchSource && personNameStr) {
      const parsed = parseName(personNameStr);
      const apolloRes = await apolloService.peopleMatch(
        parsed.firstName,
        parsed.lastName,
        companyName || 'Unknown',
        companyDomain
      );

      if (apolloRes.success && apolloRes.data.email) {
        resolvedEmail = apolloRes.data.email;
        resolvedName = apolloRes.data.fullName;
        matchSource = 'apollo';
        matchDetail = apolloRes.data;
        if (apolloRes.data.organizationName) companyName = apolloRes.data.organizationName;
      }
    }

    // Cascade 3: Hunter Email Finder
    if (!matchSource && personNameStr && companyDomain) {
      const parsed = parseName(personNameStr);
      const hunterRes = await hunterService.emailFinder(parsed.firstName, parsed.lastName, companyDomain);
      if (hunterRes.success && hunterRes.data.email) {
        resolvedEmail = hunterRes.data.email;
        resolvedName = `${hunterRes.data.firstName} ${hunterRes.data.lastName}`;
        matchSource = 'hunter';
        matchDetail = hunterRes.data;
      }
    }

    // Cascade 4: Snov.io findEmailByName
    if (!matchSource && personNameStr && companyDomain) {
      const parsed = parseName(personNameStr);
      const snovRes = await snovService.findEmailByName(parsed.firstName, parsed.lastName, companyDomain);
      if (snovRes.success && snovRes.data.email) {
        resolvedEmail = snovRes.data.email;
        resolvedName = `${parsed.firstName} ${parsed.lastName}`;
        matchSource = 'snov';
        matchDetail = snovRes.data;
      }
    }

    // Save Identity Candidates if matched
    if (matchSource && resolvedEmail) {
      const parsedName = parseName(resolvedName || personNameStr || '');
      const confidence = matchSource === 'oauth' ? 1.0 : matchSource === 'apollo' ? 0.95 : matchSource === 'hunter' ? scoreHunterFinder(matchDetail.score) : matchDetail.confidence ?? 0.8;

      await IdentityCandidate.create({
        sessionId,
        source: matchSource,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        fullName: resolvedName,
        email: resolvedEmail,
        companyName,
        companyDomain,
        linkedinUrl: matchDetail?.linkedinUrl,
        confidence,
        isDirectEmail: true,
        rawResponse: matchDetail,
      });

      // Update session with resolved details
      session.resolvedPersonName = resolvedName;
      session.lawfulBasisEstablished = true;
      if (companyName) session.resolvedCompanyName = companyName;
      if (companyDomain) session.resolvedCompanyDomain = companyDomain;
      await session.save();

      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'identity_lookup' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { matchSource, resolvedEmail }
        }
      );

      await publishSSEEvent(sessionId, 'job_complete', { stage: 'identity_lookup', result: { matchSource, resolvedEmail } });
    } else {
      // If we could not resolve a specific email, but have a name and company url, we can still proceed
      if (personNameStr && companyDomain) {
        session.resolvedPersonName = personNameStr;
        session.lawfulBasisEstablished = true;
        if (companyDomain) session.resolvedCompanyDomain = companyDomain;
        await session.save();
      }

      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'identity_lookup' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { matchSource: 'none', message: 'No high-confidence match found, using fallback pattern generation.' }
        }
      );

      await publishSSEEvent(sessionId, 'job_complete', { stage: 'identity_lookup', result: { matchSource: 'none' } });
    }

    // Enqueue Company Enrichment stage
    await enqueueJob('company_enrichment', { sessionId });

    await writeAuditLog({
      sessionId,
      action: 'identity_lookup_complete',
      actor: 'worker',
      details: { matchSource, resolvedEmail },
    });
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

export default worker;
