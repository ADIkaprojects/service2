// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — IP Enrichment Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import IpEnrichment from '../../db/models/IpEnrichment';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import { enrichIp } from '../../services/ip-intelligence';
import { publishSSEEvent } from '../../pipeline/sse';
import { enqueueJob } from '../enqueue';
import { writeAuditLog } from '../../utils/audit';
import { logger } from '../../logger';
import type { SSEPayload } from '@/types/pipeline';

const worker = new Worker(
  'ip-enrichment',
  async (job) => {
    const { sessionId, ip } = job.data as { sessionId: string; ip: string };
    const start = Date.now();
    await connectDB();

    // Update job status in database
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'ip_enrichment' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'ip_enrichment' });

    logIpState(sessionId, ip);

    const result = await enrichIp(ip);

    if (result.success) {
      const enrichment = await IpEnrichment.create({
        sessionId,
        provider: result.data.isp ? 'ipapi.is' : 'ip-api.com',
        ...result.data,
        ip,
        rawResponse: result.data,
      });

      // Update session with resolved company data if found
      const update: Record<string, unknown> = { pipelineStatus: 'identity_lookup' };
      if (result.data.org) update.resolvedCompanyName = result.data.org;
      // Note: IpIntelResult does not have companyDomain directly, but has org/isp. We can extract domain if available.
      // Let's assume organization can be treated as companyName
      await VisitorSession.findOneAndUpdate({ sessionId }, update);

      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'ip_enrichment' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { org: result.data.org, resolutionStatus: 'complete' }
        }
      );

      await publishSSEEvent(sessionId, 'job_complete', { stage: 'ip_enrichment', result: { org: result.data.org } });

      // Always enqueue the next stage to run the full pipeline
      await enqueueJob('identity_lookup', { sessionId });
    } else {
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'ip_enrichment' },
        {
          status: 'failed',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          errorMessage: result.error.message
        }
      );
      await publishSSEEvent(sessionId, 'job_failed', { stage: 'ip_enrichment', error: result.error.message });

      // Always continue to identity lookup to run the full pipeline
      await enqueueJob('identity_lookup', { sessionId });
    }

    await writeAuditLog({
      sessionId,
      action: 'ip_enrichment_complete',
      actor: 'worker',
      details: { success: result.success },
      ip
    });
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

function logIpState(sessionId: string, ip: string) {
  logger.info({ sessionId, ip }, 'IP enrichment worker processing');
}

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'IP enrichment worker job failed');
});

export default worker;
