// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Pipeline Type System
// ─────────────────────────────────────────────────────────────────────────────

// ── Pipeline lifecycle ────────────────────────────────────────────────────────

export type PipelineStatus =
  | 'created'
  | 'consent_stored'
  | 'signals_collected'
  | 'ip_enriching'
  | 'identity_lookup'
  | 'company_enriching'
  | 'domain_discovery'
  | 'email_generating'
  | 'email_verifying'
  | 'complete'
  | 'failed'
  | 'partial';

// ── Job system ────────────────────────────────────────────────────────────────

export type JobType =
  | 'ip_enrichment'
  | 'identity_lookup'
  | 'company_enrichment'
  | 'domain_discovery'
  | 'email_generation'
  | 'email_verification';

export type JobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'skipped';

// ── Email verification ────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'pending'
  | 'running'
  | 'valid'
  | 'invalid'
  | 'catch_all'
  | 'risky'
  | 'unknown'
  | 'error';

// ── Data provenance ───────────────────────────────────────────────────────────

export type SourceType =
  | 'oauth'
  | 'user_input'
  | 'direct_lookup'
  | 'generated_and_verified';

// ── Consent ───────────────────────────────────────────────────────────────────

export type ConsentScope =
  | 'ip_enrichment'
  | 'geolocation'
  | 'oauth'
  | 'email_discovery'
  | 'company_enrichment';

export type JurisdictionHint = 'gdpr' | 'ccpa' | 'general';

// ── Email patterns ────────────────────────────────────────────────────────────

export type EmailPattern =
  | 'first.last'
  | 'firstlast'
  | 'f.last'
  | 'flast'
  | 'first'
  | 'last'
  | 'last.first'
  | 'lastfirst'
  | 'firstname.l'
  | 'f.lastname'
  | 'first_last'
  | 'first-last'
  | 'initials'
  | 'unknown';

// ─────────────────────────────────────────────────────────────────────────────
// Generic service result wrapper
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

export type ServiceResult<T> =
  | { success: true; data: T; latencyMs: number }
  | { success: false; error: ServiceError; latencyMs: number };

// ─────────────────────────────────────────────────────────────────────────────
// IP enrichment
// ─────────────────────────────────────────────────────────────────────────────

export interface IpIntelResult {
  ip: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  abuseScore?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apollo People Match
// ─────────────────────────────────────────────────────────────────────────────

export interface ApolloPeopleMatchResult {
  apolloId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title?: string;
  headline?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  emailStatus?: string;
  email?: string;
  phoneNumbers?: string[];
  city?: string;
  state?: string;
  country?: string;
  organizationId?: string;
  organizationName?: string;
  seniority?: string;
  departments?: string[];
  subdepartments?: string[];
  functions?: string[];
  intentStrength?: number;
  showIntent?: boolean;
  extrapolatedEmailConfidence?: number;
  photoUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apollo Organisation
// ─────────────────────────────────────────────────────────────────────────────

export interface ApolloOrgResult {
  apolloId: string;
  name: string;
  websiteUrl?: string;
  blogUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  primaryDomain?: string;
  domains?: string[];
  phone?: string;
  industry?: string;
  subIndustry?: string;
  keywords?: string[];
  estimatedNumEmployees?: number;
  totalFunding?: number;
  latestFundingStage?: string;
  foundedYear?: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  streetAddress?: string;
  seoDescription?: string;
  shortDescription?: string;
  logo?: string;
  alexaRanking?: number;
  annualRevenue?: number;
  annualRevenueRange?: string;
  technologies?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hunter Domain Search
// ─────────────────────────────────────────────────────────────────────────────

export interface HunterDomainSearchEmail {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  sources: Array<{ domain: string; uri: string; extractedOn: string; stillOnPage: boolean }>;
  firstName?: string;
  lastName?: string;
  position?: string;
  seniority?: string;
  department?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  phoneNumber?: string;
  verification?: {
    date: string | null;
    status: VerificationStatus;
  };
}

export interface HunterDomainSearchResult {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  acceptAll: boolean;
  pattern: EmailPattern;
  organization: string;
  country?: string;
  state?: string;
  emails: HunterDomainSearchEmail[];
  metaResults: number;
  metaTotal: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hunter Email Finder
// ─────────────────────────────────────────────────────────────────────────────

export interface HunterEmailFinderResult {
  email: string;
  score: number;
  domain: string;
  acceptAll: boolean;
  position?: string;
  twitter?: string;
  linkedinUrl?: string;
  phoneNumber?: string;
  company?: string;
  firstName: string;
  lastName: string;
  sources: Array<{ domain: string; uri: string; extractedOn: string; stillOnPage: boolean }>;
  verification?: {
    date: string | null;
    status: VerificationStatus;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hunter Verify
// ─────────────────────────────────────────────────────────────────────────────

export interface HunterVerifyResult {
  email: string;
  result: VerificationStatus;
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mxRecords: boolean;
  smtpServer: boolean;
  smtpCheck: boolean;
  acceptAll: boolean;
  block: boolean;
  sources: Array<{ domain: string; uri: string; extractedOn: string; stillOnPage: boolean }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email generation pipeline
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailGenerationInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  domain: string;
  /** Known pattern from domain search, if any */
  detectedPattern?: EmailPattern;
  /** Example emails from domain search for pattern inference */
  exampleEmails?: string[];
}

export interface GeneratedCandidate {
  email: string;
  pattern: EmailPattern;
  /** 0–1 confidence score */
  confidence: number;
  source: 'pattern_match' | 'llm_inference' | 'domain_search' | 'direct_lookup';
  verificationStatus: VerificationStatus;
  verificationScore?: number;
  verifiedAt?: Date;
}

export interface VerificationResult {
  email: string;
  status: VerificationStatus;
  score: number;
  provider: 'hunter' | 'verifalia' | 'internal';
  checkedAt: Date;
  raw?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE event system
// ─────────────────────────────────────────────────────────────────────────────

export type SSEEventType =
  | 'pipeline_status'
  | 'job_queued'
  | 'job_started'
  | 'job_complete'
  | 'job_failed'
  | 'ip_result'
  | 'identity_result'
  | 'company_result'
  | 'domain_result'
  | 'email_candidate'
  | 'email_verified'
  | 'pipeline_complete'
  | 'pipeline_failed'
  | 'error'
  | 'heartbeat';

export interface SSEPayload<T = unknown> {
  event: SSEEventType;
  sessionId: string;
  timestamp: string; // ISO 8601
  data: T;
  sequenceNumber?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response envelope
// ─────────────────────────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: { code: string; message: string; details?: unknown }; requestId: string };

// ─────────────────────────────────────────────────────────────────────────────
// Session detail — full enriched session record
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionDetail {
  sessionId: string;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  consentAt?: Date;
  consentScopes: ConsentScope[];
  jurisdictionHint: JurisdictionHint;
  consentTextVersion: string;
  visitorIp: string;
  userAgent?: string;
  /** Enriched IP intelligence */
  ipIntel?: IpIntelResult;
  /** Identity data from Apollo */
  identity?: ApolloPeopleMatchResult;
  /** Organisation data from Apollo */
  organisation?: ApolloOrgResult;
  /** Domains discovered for the organisation */
  domains?: string[];
  /** Primary domain used for email discovery */
  primaryDomain?: string;
  /** Detected email pattern for primary domain */
  emailPattern?: EmailPattern;
  /** All generated + verified email candidates */
  emailCandidates: GeneratedCandidate[];
  /** The best verified email, if any */
  bestEmail?: GeneratedCandidate;
  /** Job audit trail */
  jobs: Array<{
    type: JobType;
    status: JobStatus;
    queuedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    attemptsMade: number;
  }>;
  /** Source attribution for each field category */
  sources: Partial<Record<keyof Omit<SessionDetail, 'sources' | 'jobs'>, SourceType>>;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}
