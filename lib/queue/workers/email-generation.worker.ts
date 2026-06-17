// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Email Generation Queue Worker
// ─────────────────────────────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import { getRedisConnection } from '../connection';
import { connectDB } from '../../db/connect';
import VisitorSession from '../../db/models/VisitorSession';
import PipelineJob from '../../db/models/PipelineJob';
import PatternSource from '../../db/models/PatternSource';
import EmailCandidate from '../../db/models/EmailCandidate';
import IdentityCandidate from '../../db/models/IdentityCandidate';
import { assertLawfulBasis } from '../../pipeline/compliance';
import { publishSSEEvent } from '../../pipeline/sse';
import { enqueueJob } from '../enqueue';
import { writeAuditLog } from '../../utils/audit';
import { logger } from '../../logger';
import { parseName } from '../../utils/name-parser';
import { generateCandidatesFromPattern } from '../../utils/email-patterns';
import { generateEmailCandidates } from '../../services/mistral';
import { scoreGeneratedCandidate } from '../../utils/confidence';
import type { EmailPattern } from '@/types/pipeline';

const worker = new Worker(
  'email-generation',
  async (job) => {
    const { sessionId } = job.data as { sessionId: string };
    const start = Date.now();
    await connectDB();

    // Update job status to running
    await PipelineJob.findOneAndUpdate(
      { sessionId, jobType: 'email_generation' },
      { status: 'running', startedAt: new Date() }
    );

    await publishSSEEvent(sessionId, 'job_started', { stage: 'email_generation' });

    try {
      await assertLawfulBasis(sessionId);

      const session = await VisitorSession.findOne({ sessionId });
      if (!session) {
        logger.error({ sessionId }, 'Session not found in email generation worker');
        return;
      }

      const domain = session.resolvedCompanyDomain;
      const nameStr = session.resolvedPersonName || session.oauthName || session.manualName;

      if (!domain || !nameStr) {
        const msg = !domain ? 'No domain resolved (Residential/Consumer IP fallback)' : 'No name resolved (Anonymous fallback)';
        logger.info({ sessionId, domain, nameStr }, `Email generation worker continuing with 0 candidates: ${msg}`);

        await PipelineJob.findOneAndUpdate(
          { sessionId, jobType: 'email_generation' },
          {
            status: 'complete',
            completedAt: new Date(),
            durationMs: Date.now() - start,
            outputSummary: { candidatesCount: 0, reason: msg }
          }
        );

        await publishSSEEvent(sessionId, 'job_complete', { stage: 'email_generation', result: { candidatesCount: 0 } });

        // Enqueue Email Verification stage so the pipeline completes 100%
        await enqueueJob('email_verification', { sessionId });

        await writeAuditLog({
          sessionId,
          action: 'email_generation_complete',
          actor: 'worker',
          details: { candidatesCount: 0, reason: msg },
        });
        return;
      }

      const nameTokens = parseName(nameStr);

      // Fetch all PatternSources to get detected patterns & emails
      const patternSources = await PatternSource.find({ sessionId });
      const exampleEmailsSet = new Set<string>();
      const patternsSet = new Set<EmailPattern>();

      for (const source of patternSources) {
        if (source.exampleEmails) {
          for (const email of source.exampleEmails) {
            exampleEmailsSet.add(email);
          }
        }
        if (source.detectedPatterns) {
          for (const p of source.detectedPatterns) {
            patternsSet.add(p as EmailPattern);
          }
        }
      }

      const exampleEmails = Array.from(exampleEmailsSet);
      const patterns = Array.from(patternsSet);
      const primaryPattern: EmailPattern = patterns[0] ?? 'unknown';

      // 1. Generate local candidates using all known patterns
      const localEmails = generateCandidatesFromPattern(nameTokens, domain, 'unknown');
      const localCandidatesMap = new Map<string, { email: string; pattern: EmailPattern; confidence: number; source: 'pattern_match' }>();

      for (const email of localEmails) {
        // Deduce pattern
        let matchedPattern: EmailPattern = 'unknown';
        // simple heuristics to identify which pattern produced this email
        const local = email.split('@')[0];
        const f = nameTokens.firstName.toLowerCase().replace(/[^a-z]/g, '');
        const l = nameTokens.lastName.toLowerCase().replace(/[^a-z]/g, '');
        const f0 = f[0] ?? '';
        const l0 = l[0] ?? '';

        if (local === `${f}.${l}`) matchedPattern = 'first.last';
        else if (local === `${f}${l}`) matchedPattern = 'firstlast';
        else if (local === `${f0}.${l}`) matchedPattern = 'f.last';
        else if (local === `${f0}${l}`) matchedPattern = 'flast';
        else if (local === f) matchedPattern = 'first';
        else if (local === l) matchedPattern = 'last';
        else if (local === `${l}.${f}`) matchedPattern = 'last.first';
        else if (local === `${l}${f}`) matchedPattern = 'lastfirst';
        else if (local === `${f}.${l0}`) matchedPattern = 'firstname.l';
        else if (local === `${f0}.${l}`) matchedPattern = 'f.lastname';
        else if (local === `${f}_${l}`) matchedPattern = 'first_last';
        else if (local === `${f}-${l}`) matchedPattern = 'first-last';
        else if (local === `${f0}${l0}`) matchedPattern = 'initials';

        const initialConfidence = scoreGeneratedCandidate(matchedPattern, 'pending', undefined, 'pattern_match');

        localCandidatesMap.set(email, {
          email,
          pattern: matchedPattern,
          confidence: initialConfidence,
          source: 'pattern_match',
        });
      }

      // 2. Generate LLM candidates using Mistral AI
      let llmCandidates: any[] = [];
      try {
        const mistralRes = await generateEmailCandidates({
          firstName: nameTokens.firstName,
          lastName: nameTokens.lastName,
          middleName: nameTokens.middleName,
          domain,
          detectedPattern: primaryPattern,
          exampleEmails,
        });
        llmCandidates = mistralRes.candidates;
      } catch (err) {
        logger.error({ sessionId, err }, 'Mistral candidate generation failed in worker, using local fallback only');
      }

      // 3. Merge candidates
      const finalCandidatesMap = new Map<string, { email: string; pattern: EmailPattern; confidenceScore: number; rationale: string; generatedBy: 'mistral' | 'pattern_code' | 'direct_lookup' }>();

      // Add direct lookup candidates from IdentityCandidate (Apollo, OAuth, Snov, etc.) first
      const identityCandidates = await IdentityCandidate.find({ sessionId });
      for (const ic of identityCandidates) {
        if (ic.email) {
          const key = ic.email.toLowerCase();
          finalCandidatesMap.set(key, {
            email: ic.email,
            pattern: 'unknown',
            confidenceScore: ic.confidence || 0.95,
            rationale: `Resolved directly during identity lookup via ${ic.source.toUpperCase()}.`,
            generatedBy: 'direct_lookup',
          });
        }
      }

      // Add local ones
      for (const [email, lc] of localCandidatesMap.entries()) {
        const key = email.toLowerCase();
        if (!finalCandidatesMap.has(key)) {
          finalCandidatesMap.set(key, {
            email,
            pattern: lc.pattern,
            confidenceScore: lc.confidence,
            rationale: 'Generative rule matching standard pattern.',
            generatedBy: 'pattern_code',
          });
        }
      }

      // Merge LLM candidates
      for (const lc of llmCandidates) {
        const key = lc.email.toLowerCase();
        const existing = finalCandidatesMap.get(key);
        const score = Math.max(lc.confidence, existing?.confidenceScore ?? 0);
        finalCandidatesMap.set(key, {
          email: lc.email,
          pattern: lc.pattern,
          confidenceScore: score,
          rationale: lc.rationale || 'Inferred by Mistral AI.',
          generatedBy: existing?.generatedBy === 'direct_lookup' ? 'direct_lookup' : 'mistral',
        });
      }

      // Sort by confidence score descending
      const sortedCandidates = Array.from(finalCandidatesMap.values())
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 50);

      // Save EmailCandidate records
      const insertedCandidates = [];
      let rank = 1;
      for (const c of sortedCandidates) {
        const record = await EmailCandidate.create({
          sessionId,
          domain,
          email: c.email,
          pattern: c.pattern,
          generatedBy: c.generatedBy,
          rank: rank++,
          confidenceScore: c.confidenceScore,
          rationale: c.rationale,
          verificationStatus: 'pending',
        });
        insertedCandidates.push(record);
      }

      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'email_generation' },
        {
          status: 'complete',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputSummary: { candidatesCount: insertedCandidates.length }
        }
      );

      await publishSSEEvent(sessionId, 'job_complete', { stage: 'email_generation', result: { candidatesCount: insertedCandidates.length } });

      // Enqueue Email Verification stage
      await enqueueJob('email_verification', { sessionId });

      await writeAuditLog({
        sessionId,
        action: 'email_generation_complete',
        actor: 'worker',
        details: { candidatesCount: insertedCandidates.length },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Email generation failed';
      logger.error({ sessionId, err }, 'Email generation worker failed');
      await PipelineJob.findOneAndUpdate(
        { sessionId, jobType: 'email_generation' },
        { status: 'failed', completedAt: new Date(), errorMessage: msg }
      );
      await publishSSEEvent(sessionId, 'job_failed', { stage: 'email_generation', error: msg });

      // Always enqueue the next stage to run the full pipeline
      await enqueueJob('email_verification', { sessionId });
    }
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

export default worker;
