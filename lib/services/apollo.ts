// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Apollo.io Service Adapter
// ─────────────────────────────────────────────────────────────────────────────

import { config } from '../config';
import { childLogger } from '../logger';
import type { ServiceResult, ServiceError, ApolloPeopleMatchResult, ApolloOrgResult } from '@/types/pipeline';

const log = childLogger('apollo');

const APOLLO_API = 'https://api.apollo.io/v1';

function makeError(code: string, message: string, retryable: boolean, statusCode?: number): ServiceError {
  return { code, message, retryable, statusCode };
}

function guardKey(): boolean {
  return Boolean(config.services.apollo);
}

export async function peopleMatch(
  firstName: string,
  lastName: string,
  organizationName: string,
  domain?: string
): Promise<ServiceResult<ApolloPeopleMatchResult>> {
  const start = Date.now();

  if (!guardKey()) {
    return {
      success: false,
      error: makeError('SERVICE_UNAVAILABLE', 'Apollo.io API key not configured', false),
      latencyMs: 0,
    };
  }

  try {
    log.debug({ firstName, lastName, organizationName, domain }, 'Apollo people match request');

    const res = await fetch(`${APOLLO_API}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.services.apollo!,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_name: organizationName,
        domain,
        reveal_personal_emails: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw Object.assign(new Error(`Apollo HTTP ${res.status}: ${text}`), { statusCode: res.status });
    }

    const raw = await res.json() as {
      person?: {
        id: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        title?: string;
        headline?: string;
        linkedin_url?: string;
        twitter_url?: string;
        github_url?: string;
        email_status?: string;
        email?: string;
        phone_numbers?: string[];
        city?: string;
        state?: string;
        country?: string;
        organization_id?: string;
        organization?: {
          name?: string;
          primary_domain?: string;
        };
        seniority?: string;
        departments?: string[];
        subdepartments?: string[];
        functions?: string[];
        intent_strength?: number;
        show_intent?: boolean;
        extrapolated_email_confidence?: number;
        photo_url?: string;
      };
    };

    if (!raw.person) {
      return {
        success: false,
        error: makeError('APOLLO_NOT_FOUND', 'No matching person found in Apollo', false),
        latencyMs: Date.now() - start,
      };
    }

    const p = raw.person;
    const data: ApolloPeopleMatchResult = {
      apolloId: p.id,
      firstName: p.first_name ?? firstName,
      lastName: p.last_name ?? lastName,
      fullName: p.name ?? `${p.first_name ?? firstName} ${p.last_name ?? lastName}`.trim(),
      title: p.title,
      headline: p.headline,
      linkedinUrl: p.linkedin_url,
      twitterUrl: p.twitter_url,
      githubUrl: p.github_url,
      emailStatus: p.email_status,
      email: p.email,
      phoneNumbers: p.phone_numbers,
      city: p.city,
      state: p.state,
      country: p.country,
      organizationId: p.organization_id,
      organizationName: p.organization?.name ?? organizationName,
      seniority: p.seniority,
      departments: p.departments,
      subdepartments: p.subdepartments,
      functions: p.functions,
      intentStrength: p.intent_strength,
      showIntent: p.show_intent,
      extrapolatedEmailConfidence: p.extrapolated_email_confidence,
      photoUrl: p.photo_url,
    };

    log.info({ apolloId: p.id, email: p.email }, 'Apollo people match success');
    return {
      success: true,
      data,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const statusCode = (err as { statusCode?: number }).statusCode;
    log.error({ firstName, lastName, organizationName, err }, 'Apollo people match failed');
    return {
      success: false,
      error: makeError('APOLLO_REQUEST_FAILED', message, true, statusCode),
      latencyMs: Date.now() - start,
    };
  }
}

export async function organizationEnrich(domain: string): Promise<ServiceResult<ApolloOrgResult>> {
  const start = Date.now();

  if (!guardKey()) {
    return {
      success: false,
      error: makeError('SERVICE_UNAVAILABLE', 'Apollo.io API key not configured', false),
      latencyMs: 0,
    };
  }

  try {
    log.debug({ domain }, 'Apollo organization enrich request');

    const res = await fetch(`${APOLLO_API}/organizations/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.services.apollo!,
      },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw Object.assign(new Error(`Apollo HTTP ${res.status}: ${text}`), { statusCode: res.status });
    }

    const raw = await res.json() as {
      organization?: {
        id: string;
        name: string;
        website_url?: string;
        blog_url?: string;
        linkedin_url?: string;
        twitter_url?: string;
        facebook_url?: string;
        primary_domain?: string;
        domains?: string[];
        phone?: string;
        industry?: string;
        sub_industry?: string;
        keywords?: string[];
        estimated_num_employees?: number;
        total_funding?: number;
        latest_funding_stage?: string;
        founded_year?: number;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
        street_address?: string;
        seo_description?: string;
        short_description?: string;
        logo_url?: string;
        alexa_ranking?: number;
        annual_revenue?: number;
        annual_revenue_range?: string;
        technologies?: string[];
      };
    };

    if (!raw.organization) {
      return {
        success: false,
        error: makeError('APOLLO_NOT_FOUND', 'No matching organization found in Apollo', false),
        latencyMs: Date.now() - start,
      };
    }

    const o = raw.organization;
    const data: ApolloOrgResult = {
      apolloId: o.id,
      name: o.name,
      websiteUrl: o.website_url,
      blogUrl: o.blog_url,
      linkedinUrl: o.linkedin_url,
      twitterUrl: o.twitter_url,
      facebookUrl: o.facebook_url,
      primaryDomain: o.primary_domain,
      domains: o.domains,
      phone: o.phone,
      industry: o.industry,
      subIndustry: o.sub_industry,
      keywords: o.keywords,
      estimatedNumEmployees: o.estimated_num_employees,
      totalFunding: o.total_funding,
      latestFundingStage: o.latest_funding_stage,
      foundedYear: o.founded_year,
      city: o.city,
      state: o.state,
      country: o.country,
      postalCode: o.postal_code,
      streetAddress: o.street_address,
      seoDescription: o.seo_description,
      shortDescription: o.short_description,
      logo: o.logo_url,
      alexaRanking: o.alexa_ranking,
      annualRevenue: o.annual_revenue,
      annualRevenueRange: o.annual_revenue_range,
      technologies: o.technologies,
    };

    log.info({ domain, orgId: o.id }, 'Apollo organization enrich success');
    return {
      success: true,
      data,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const statusCode = (err as { statusCode?: number }).statusCode;
    log.error({ domain, err }, 'Apollo organization enrich failed');
    return {
      success: false,
      error: makeError('APOLLO_REQUEST_FAILED', message, true, statusCode),
      latencyMs: Date.now() - start,
    };
  }
}
