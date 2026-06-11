// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Domain Discovery Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import PatternSource from '../../db/models/PatternSource';
import { assertLawfulBasis } from '../../pipeline/compliance';
import { publishSSEEvent } from '../../pipeline/sse';
import { enqueueJob } from '../enqueue';
import { writeAuditLog } from '../../utils/audit';
import { logger } from '../../logger';
import * as hunterService from '../../services/hunter';
import * as snovService from '../../services/snov';
import * as serperService from '../../services/serper';
import * as tavilyService from '../../services/tavily';

const worker = new Worker(
  'domain-discovery',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const start = Date.now();
    await connectDB();

    // Update job status to running
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'domain_discovery' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'domain_discovery' });

    try {
      await assertLawfulBasis(sessionId);
    } catch (complianceErr) {
      const msg = complianceErr instanceof Error ? complianceErr.message : 'Compliance validation failed';
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'domain_discovery' },
        { status: 'failed', completedAt: new Date(), errorMessage: msg }
      );
      // Skip remaining jobs
      await PipelineJob.updateMany(
        {
          sessionId,
          jobType: { $in: ['email_generation', 'email_verification'] }
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
      logger.error({ sessionId }, 'Session not found in domain discovery worker');
      return;
    }

    const domain = session.resolvedCompanyDomain;
    const companyName = session.resolvedCompanyName || 'Unknown';

    if (!domain) {
      logDiscoveryComplete(sessionId, 'No domain resolved for session, skipping discovery');
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'domain_discovery' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { skipped: true, reason: 'no_domain' }
        }
      );
      await publishSSEEvent(sessionId, 'job_complete', { stage: 'domain_discovery', result: { skipped: true } });
      await enqueueJob('email_generation', { sessionId });
      return;
    }

    // Run discovery API calls in parallel
    const [hunterRes, snovRes, serperRes, tavilyRes] = await Promise.all([
      hunterService.domainSearch(domain).catch((e) => ({ success: false as const, error: String(e) })),
      snovService.findEmailsByDomain(domain).catch((e) => ({ success: false as const, error: String(e) })),
      serperService.searchCompanyEmailPattern(domain, companyName).catch((e) => ({ examples: [], inferredPatterns: [], rawResults: [] })),
      tavilyService.deepCompanyResearch(companyName, domain).catch((e) => ({ examples: [], inferredPatterns: [] })),
    ]);

    const createdSources: string[] = [];

    // 1. Process Hunter Domain Search
    if (hunterRes.success) {
      const h = hunterRes.data;
      const hPatterns = h.pattern ? [h.pattern] : [];
      const hEmails = h.emails.map((e) => e.value);

      if (hPatterns.length || hEmails.length) {
        await PatternSource.create({
          sessionId,
          domain,
          source: 'hunter_domain_search',
          detectedPatterns: hPatterns,
          exampleEmails: hEmails,
          rawResponse: h,
          confidence: 0.9,
        });
        createdSources.push('hunter');
      }
    }

    // 2. Process Snov.io Domain Search
    if (snovRes.success) {
      const s = snovRes.data;
      if (s.patterns.length || s.emails.length) {
        await PatternSource.create({
          sessionId,
          domain,
          source: 'snov_domain_search',
          detectedPatterns: s.patterns,
          exampleEmails: s.emails,
          rawResponse: s,
          confidence: 0.8,
        });
        createdSources.push('snov');
      }
    }

    // 3. Process Serper
    if (serperRes.examples.length) {
      await PatternSource.create({
        sessionId,
        domain,
        source: 'serper_discovery',
        detectedPatterns: [],
        exampleEmails: serperRes.examples,
        rawResponse: serperRes.rawResults,
        confidence: 0.6,
      });
      createdSources.push('serper');
    }

    // 4. Process Tavily
    if (tavilyRes.examples.length) {
      await PatternSource.create({
        sessionId,
        domain,
        source: 'tavily_discovery',
        detectedPatterns: [],
        exampleEmails: tavilyRes.examples,
        rawResponse: tavilyRes.examples,
        confidence: 0.5,
      });
      createdSources.push('tavily');
    }

    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'domain_discovery' },
      {
        status: 'complete',
        completedAt: new Date(),
        durationMs: Date.now() - start,
        outputSummary: { sources: createdSources, domain }
      }
    );

    await publishSSEEvent(sessionId, 'job_complete', { stage: 'domain_discovery', result: { sources: createdSources } });

    // Enqueue Email Generation stage
    await enqueueJob('email_generation', { sessionId });

    await writeAuditLog({
      sessionId,
      action: 'domain_discovery_complete',
      actor: 'worker',
      details: { sources: createdSources, domain },
    });
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

function logDiscoveryComplete(sessionId: string, message: string) {
  logger.info({ sessionId }, message);
}

export default worker;
