// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Email Verification Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import EmailCandidate from '../../db/models/EmailCandidate';
import VerifiedEmail from '../../db/models/VerifiedEmail';
import { assertLawfulBasis } from '../../pipeline/compliance';
import { publishSSEEvent } from '../../pipeline/sse';
import { verifyEmail } from '../../services/email-verifier';
import { scoreGeneratedCandidate } from '../../utils/confidence';
import { writeAuditLog } from '../../utils/audit';
import { config } from '../../config';
import { logger } from '../../logger';
import type { EmailPattern } from '@/types/pipeline';

const worker = new Worker(
  'email-verification',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const start = Date.now();
    await connectDB();

    // Update job status to running
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'email_verification' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'email_verification' });

    try {
      await assertLawfulBasis(sessionId);
    } catch (complianceErr) {
      const msg = complianceErr instanceof Error ? complianceErr.message : 'Compliance validation failed';
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'email_verification' },
        { status: 'failed', completedAt: new Date(), errorMessage: msg }
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
      logger.error({ sessionId }, 'Session not found in email verification worker');
      return;
    }

    // Fetch all pending candidates
    const candidates = await EmailCandidate.find({ sessionId });

    // Verify candidates sequentially or with limited concurrency to avoid API rate limits
    let verifiedCount = 0;
    const minConf = config.pipeline.verifiedEmailMinConfidence || 0.75;
    const catchAllMinConf = config.pipeline.catchAllMinConfidence || 0.55;

    for (const c of candidates) {
      await EmailCandidate.findByIdAndUpdate(c._id, { verificationStatus: 'running' });

      // Run verification
      const result = await verifyEmail(c.email);

      // Re-score based on verification status
      const updatedConf = scoreGeneratedCandidate(
        (c.pattern as EmailPattern) || 'unknown',
        result.status,
        result.score,
        c.generatedBy === 'mistral' ? 'llm_inference' : 'pattern_match'
      );

      // Update candidate database record
      c.verificationStatus = result.status;
      c.verificationProvider = result.provider;
      c.verificationDetail = result.raw;
      c.confidenceScore = updatedConf;
      c.verifiedAt = result.checkedAt;
      await c.save();

      // Emit SSE email_verified event
      await publishSSEEvent(sessionId, 'email_verified', {
        email: c.email,
        pattern: c.pattern,
        confidence: updatedConf,
        verificationStatus: result.status,
        rank: c.rank,
      });

      // Filter and insert into VerifiedEmail collection based on confidence gates
      const isValid = result.status === 'valid' && updatedConf >= minConf;
      const isCatchAllAccepted = result.status === 'catch_all' && updatedConf >= catchAllMinConf;

      if (isValid || isCatchAllAccepted) {
        const isOauth = session.oauthEmail?.toLowerCase() === c.email.toLowerCase();
        const rawHunter = result.raw as any;

        await VerifiedEmail.create({
          sessionId,
          candidateId: c._id,
          email: c.email,
          domain: c.domain,
          verificationProvider: result.provider,
          verificationStatus: isValid ? 'valid' : 'catch_all_accepted',
          mxValid: rawHunter?.mxRecords ?? rawHunter?.mx_records ?? true,
          smtpAccepted: rawHunter?.smtpCheck ?? rawHunter?.smtp_check ?? true,
          isCatchAll: result.status === 'catch_all',
          isDisposable: rawHunter?.disposable ?? false,
          confidenceScore: updatedConf,
          sourceType: isOauth ? 'oauth' : 'generated_and_verified',
          personName: session.resolvedPersonName,
          companyName: session.resolvedCompanyName,
          lastCheckedAt: result.checkedAt,
        });

        verifiedCount++;
      }
    }

    // Mark pipeline complete
    await VisitorSession.findOneAndUpdate(
      { sessionId },
      {
        pipelineStatus: 'complete',
        pipelineCompletedAt: new Date(),
        finalVerifiedEmailCount: verifiedCount,
      }
    );

    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'email_verification' },
      {
        status: 'complete',
        completedAt: new Date(),
        durationMs: Date.now() - start,
        outputSummary: { verifiedCount }
      }
    );

    await publishSSEEvent(sessionId, 'pipeline_complete', { verifiedEmailCount: verifiedCount });

    await writeAuditLog({
      sessionId,
      action: 'email_verification_complete',
      actor: 'worker',
      details: { verifiedCount },
    });
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

export default worker;
