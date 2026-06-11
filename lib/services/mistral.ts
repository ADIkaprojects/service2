// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Mistral AI Service Adapter
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import type { EmailGenerationInput, GeneratedCandidate, EmailPattern } from '@/types/pipeline';

const log = childLogger('mistral');

function guardKey(): boolean {
  return Boolean(config.services.mistral);
}

export async function generateEmailCandidates(
  input: EmailGenerationInput
): Promise<{ candidates: GeneratedCandidate[]; error?: string }> {
  if (!guardKey()) {
    log.warn('Mistral API key not configured');
    return { candidates: [], error: 'Mistral API key not configured' };
  }

  const { firstName, lastName, middleName, domain, detectedPattern, exampleEmails = [] } = input;
  const count = config.pipeline.mistralCandidateCount || 50;

  const systemPrompt = `You are a corporate email pattern inference engine. Your job is to generate ${count} ranked email address candidates for a specific person at a specific company, using all provided evidence. You analyze detected company patterns, naming conventions, regional norms, and any real examples found. Return ONLY a valid JSON object containing an array named "candidates". Every object in the array must have exactly: email, pattern, confidence (0.0-1.0), rank (1-${count}), and rationale.`;

  const userPrompt = `Generate ${count} ranked email address candidates.

Person:
- First name: ${firstName}
- Last name: ${lastName}
- Middle name / initial: ${middleName ?? 'none'}

Company:
- Domain: ${domain}

Evidence from domain research:
- Detected pattern: ${detectedPattern ?? 'none'}
- Real emails found at this domain: ${exampleEmails.join(', ') || 'none found'}

Ranking rules:
1. Patterns that MATCH the detected company pattern should rank highest.
2. If real example emails exist, patterns consistent with them rank next.
3. Cover all variations: first.last, firstlast, f.last, flast, first, last, last.first, lastfirst, firstname.l, f.lastname, first_last, first-last, and initials-based formats.
4. Higher rank = higher probability. Rank 1 is your best guess.

Return JSON object with "candidates" array only. No markdown. No code fences.`;

  try {
    log.debug({ domain, firstName, lastName }, 'Mistral candidate generation request');

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.services.mistral!}`,
      },
      body: JSON.stringify({
        model: 'mistral-medium-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      log.error({ status: res.status, error: err }, 'Mistral HTTP error');
      return { candidates: [], error: `Mistral HTTP ${res.status}: ${err}` };
    }

    const data = await res.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const rawContent = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: { candidates?: Array<{ email: string; pattern: string; confidence: number; rationale?: string }> } = {};

    try {
      parsed = JSON.parse(rawContent.trim());
    } catch (parseErr) {
      log.error({ rawContent, parseErr }, 'Failed to parse Mistral response JSON');
      return { candidates: [], error: 'Failed to parse Mistral response JSON' };
    }

    const rawCandidates = parsed.candidates ?? [];
    const candidates: GeneratedCandidate[] = rawCandidates
      .filter((c) => c && typeof c.email === 'string' && c.email.includes('@'))
      .map((c) => ({
        email: c.email.toLowerCase().trim(),
        pattern: (c.pattern as EmailPattern) ?? 'unknown',
        confidence: typeof c.confidence === 'number' ? Math.min(1, Math.max(0, c.confidence)) : 0.5,
        source: 'llm_inference',
        verificationStatus: 'pending',
      }));

    log.info({ domain, candidatesGenerated: candidates.length }, 'Mistral candidate generation success');
    return { candidates };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ domain, err }, 'Mistral candidate generation exception');
    return { candidates: [], error: message };
  }
}
