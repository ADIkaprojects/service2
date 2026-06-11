// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Serper.dev Service Adapter
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import { extractEmailsFromText } from '../utils/email-patterns';

const log = childLogger('serper');

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic?: SerperResult[];
}

function guardKey(): boolean {
  return Boolean(config.services.serper);
}

export async function searchCompanyEmailPattern(
  domain: string,
  companyName: string
): Promise<{ examples: string[]; inferredPatterns: string[]; rawResults: unknown[] }> {
  const start = Date.now();

  if (!guardKey()) {
    log.warn('Serper.dev key not configured, skipping');
    return { examples: [], inferredPatterns: [], rawResults: [] };
  }

  const query1 = `"${domain}" site:github.com OR site:linkedin.com`;
  const query2 = `"${domain}" email contact`;
  const queries = [query1, query2];

  try {
    log.debug({ domain, companyName }, 'Running Serper email pattern search');

    const searchPromises = queries.map(async (q) => {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': config.services.serper!,
        },
        body: JSON.stringify({ q, num: 10 }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`Serper HTTP ${res.status}`);
      }

      return res.json() as Promise<SerperResponse>;
    });

    const results = await Promise.all(searchPromises);
    const examplesSet = new Set<string>();
    const rawResults: unknown[] = [];

    const lowerDomain = domain.toLowerCase().trim();

    for (const res of results) {
      if (res.organic) {
        rawResults.push(...res.organic);
        for (const item of res.organic) {
          const textToSearch = `${item.title} ${item.link} ${item.snippet}`;
          const extracted = extractEmailsFromText(textToSearch);
          for (const email of extracted) {
            if (email.endsWith(`@${lowerDomain}`)) {
              examplesSet.add(email);
            }
          }
        }
      }
    }

    const examples = Array.from(examplesSet);
    log.info({ domain, foundEmails: examples.length, latencyMs: Date.now() - start }, 'Serper pattern search complete');

    return {
      examples,
      inferredPatterns: [], // Left for worker to combine and pass to pattern detector
      rawResults,
    };
  } catch (err) {
    log.error({ domain, err }, 'Serper pattern search failed');
    return { examples: [], inferredPatterns: [], rawResults: [] };
  }
}
