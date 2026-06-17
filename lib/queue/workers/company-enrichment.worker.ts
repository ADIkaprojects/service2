// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Company Enrichment Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import CompanyProfile from '../../db/models/CompanyProfile';
import { assertLawfulBasis } from '../../pipeline/compliance';
import { publishSSEEvent } from '../../pipeline/sse';
import { enqueueJob } from '../enqueue';
import { writeAuditLog } from '../../utils/audit';
import { logger } from '../../logger';
import * as apolloService from '../../services/apollo';

const worker = new Worker(
  'company-enrichment',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const start = Date.now();
    await connectDB();

    // Update job status to running
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'company_enrichment' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'company_enrichment' });

    try {
      await assertLawfulBasis(sessionId);

      const session = await VisitorSession.findOne({ sessionId });
      if (!session) {
        logger.error({ sessionId }, 'Session not found in company enrichment worker');
        return;
      }

      const domain = session.resolvedCompanyDomain;
      let enriched = false;
      let profileDetail: any = null;

      if (domain) {
        // Call Apollo Organization Enrichment
        const apolloRes = await apolloService.organizationEnrich(domain);

        if (apolloRes.success) {
          const o = apolloRes.data;
          profileDetail = o;
          enriched = true;

          await CompanyProfile.create({
            sessionId,
            domain,
            companyName: o.name,
            industry: o.industry,
            employeeCount: o.estimatedNumEmployees,
            linkedinUrl: o.linkedinUrl,
            country: o.country,
            city: o.city,
            description: o.shortDescription || o.seoDescription,
            source: 'apollo',
            rawResponse: o,
            confidenceScore: 0.9,
          });

          // Update session organization name if it wasn't set yet
          if (!session.resolvedCompanyName && o.name) {
            session.resolvedCompanyName = o.name;
            await session.save();
          }
        }
      }

      if (!enriched) {
        // Create a skeleton company profile from existing session data if domain is present
        if (domain || session.resolvedCompanyName) {
          await CompanyProfile.create({
            sessionId,
            domain: domain || 'unknown.local',
            companyName: session.resolvedCompanyName || '',
            source: 'manual',
            rawResponse: {},
            confidenceScore: 0.3,
          });
        }
      }

      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'company_enrichment' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { enriched, domain }
        }
      );

      await publishSSEEvent(sessionId, 'job_complete', { stage: 'company_enrichment', result: { enriched, domain } });

      // Enqueue domain discovery stage
      await enqueueJob('domain_discovery', { sessionId });

      await writeAuditLog({
        sessionId,
        action: 'company_enrichment_complete',
        actor: 'worker',
        details: { enriched, domain },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Company enrichment failed';
      logger.error({ sessionId, err }, 'Company enrichment worker failed');
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'company_enrichment' },
        { status: 'failed', completedAt: new Date(), errorMessage: msg }
      );
      await publishSSEEvent(sessionId, 'job_failed', { stage: 'company_enrichment', error: msg });

      // Always enqueue the next stage to run the full pipeline
      await enqueueJob('domain_discovery', { sessionId });
    }
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

export default worker;
