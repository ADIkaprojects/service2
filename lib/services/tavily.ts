// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Tavily.com Service Adapter
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import { extractEmailsFromText } from '../utils/email-patterns';

const log = childLogger('tavily');

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

function guardKey(): boolean {
  return Boolean(config.services.tavily);
}

export async function deepCompanyResearch(
  companyName: string,
  domain: string
): Promise<{ examples: string[]; inferredPatterns: string[] }> {
  const start = Date.now();

  if (!guardKey()) {
    log.warn('Tavily key not configured, skipping');
    return { examples: [], inferredPatterns: [] };
  }

  try {
    log.debug({ domain, companyName }, 'Running Tavily deep company research');

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.services.tavily!,
        query: `${companyName} employee professional email format ${domain} contact`,
        search_depth: 'advanced',
        max_results: 8,
        include_raw_content: true,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Tavily HTTP ${res.status}: ${text}`);
    }

    const data = await res.json() as TavilyResponse;
    const examplesSet = new Set<string>();

    const lowerDomain = domain.toLowerCase().trim();

    if (data.results) {
      for (const item of data.results) {
        const textToSearch = `${item.title} ${item.content} ${item.rawContent ?? ''}`;
        const extracted = extractEmailsFromText(textToSearch);
        for (const email of extracted) {
          if (email.endsWith(`@${lowerDomain}`)) {
            examplesSet.add(email);
          }
        }
      }
    }

    const examples = Array.from(examplesSet);
    log.info({ domain, foundEmails: examples.length, latencyMs: Date.now() - start }, 'Tavily research complete');

    return {
      examples,
      inferredPatterns: [],
    };
  } catch (err) {
    log.error({ domain, err }, 'Tavily research failed');
    return { examples: [], inferredPatterns: [] };
  }
}
