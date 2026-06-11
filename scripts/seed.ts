// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Database Seeding Script
// ─────────────────────────────────────────────────────────────────────────────

import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';

// Load environment variables
loadEnvConfig(process.cwd(), true);

import { connectDB } from '../lib/db/connect';
import VisitorSession from '../lib/db/models/VisitorSession';
import Consent from '../lib/db/models/Consent';
import RawSignal from '../lib/db/models/RawSignal';
import IpEnrichment from '../lib/db/models/IpEnrichment';
import CompanyProfile from '../lib/db/models/CompanyProfile';
import PatternSource from '../lib/db/models/PatternSource';
import IdentityCandidate from '../lib/db/models/IdentityCandidate';
import EmailCandidate from '../lib/db/models/EmailCandidate';
import VerifiedEmail from '../lib/db/models/VerifiedEmail';
import PipelineJob from '../lib/db/models/PipelineJob';
import AuditLog from '../lib/db/models/AuditLog';

async function seed() {
  console.log('Connecting to database for seeding...');
  await connectDB();

  console.log('Clearing existing collection data...');
  await Promise.all([
    VisitorSession.deleteMany({}),
    Consent.deleteMany({}),
    RawSignal.deleteMany({}),
    IpEnrichment.deleteMany({}),
    CompanyProfile.deleteMany({}),
    PatternSource.deleteMany({}),
    IdentityCandidate.deleteMany({}),
    EmailCandidate.deleteMany({}),
    VerifiedEmail.deleteMany({}),
    PipelineJob.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log('Inserting seed records...');

  const now = new Date();

  // ───────────────────────────────────────────────────────────────────────────
  // Session 1: Complete and enriched (Stripe)
  // ───────────────────────────────────────────────────────────────────────────
  const s1Id = 'sess_stripe_complete_001';
  const s1Date = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago

  await VisitorSession.create({
    sessionId: s1Id,
    ip: '136.24.111.22',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    language: 'en-US',
    timezone: 'America/Los_Angeles',
    screenWidth: 1440,
    screenHeight: 900,
    landingUrl: 'http://localhost:3000/',
    geoPermissionGranted: true,
    latitude: 37.7749,
    longitude: -122.4194,
    oauthProvider: 'google',
    oauthEmail: 'sarah.jenkins@stripe.com',
    oauthName: 'Sarah Jenkins',
    pipelineStatus: 'complete',
    lawfulBasisEstablished: true,
    resolvedCompanyDomain: 'stripe.com',
    resolvedCompanyName: 'Stripe',
    resolvedPersonName: 'Sarah Jenkins',
    finalVerifiedEmailCount: 2,
    pipelineStartedAt: s1Date,
    pipelineCompletedAt: new Date(s1Date.getTime() + 45 * 1000),
    createdAt: s1Date,
  });

  await Consent.create({
    sessionId: s1Id,
    consentTextVersion: 'v1.0',
    grantedScopes: ['ip_enrichment', 'geolocation', 'oauth', 'email_discovery', 'company_enrichment'],
    ip: '136.24.111.22',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    jurisdictionHint: 'general',
    timestamp: s1Date,
  });

  await RawSignal.create({
    sessionId: s1Id,
    signalType: 'oauth',
    rawPayload: { email: 'sarah.jenkins@stripe.com', name: 'Sarah Jenkins', provider: 'google' },
    collectedAt: s1Date,
  });

  await IpEnrichment.create({
    sessionId: s1Id,
    ip: '136.24.111.22',
    provider: 'ipapi.is',
    countryCode: 'US',
    countryName: 'United States',
    regionName: 'California',
    city: 'San Francisco',
    postalCode: '94103',
    lat: 37.7749,
    lon: -122.4194,
    timezone: 'America/Los_Angeles',
    isp: 'Comcast Cable',
    org: 'Stripe, Inc.',
    asn: 'AS30060',
    isProxy: false,
    isVpn: false,
    isDatacenter: false,
    rawResponse: {},
    confidenceScore: 1.0,
    resolutionStatus: 'resolved',
  });

  await CompanyProfile.create({
    sessionId: s1Id,
    domain: 'stripe.com',
    companyName: 'Stripe',
    industry: 'Financial Services',
    employeeCount: 8500,
    linkedinUrl: 'https://www.linkedin.com/company/stripe',
    country: 'US',
    city: 'San Francisco',
    description: 'Stripe is a financial infrastructure platform for the internet.',
    source: 'apollo',
    rawResponse: {},
    confidenceScore: 0.95,
  });

  await PatternSource.create({
    sessionId: s1Id,
    domain: 'stripe.com',
    source: 'hunter_domain_search',
    detectedPatterns: ['first.last'],
    exampleEmails: ['collins@stripe.com', 'patrick@stripe.com', 'john.doe@stripe.com'],
    rawResponse: {},
    confidence: 0.85,
  });

  await IdentityCandidate.create({
    sessionId: s1Id,
    source: 'oauth',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    fullName: 'Sarah Jenkins',
    email: 'sarah.jenkins@stripe.com',
    companyName: 'Stripe',
    companyDomain: 'stripe.com',
    confidence: 1.0,
    isDirectEmail: true,
    rawResponse: {},
  });

  const c1 = await EmailCandidate.create({
    sessionId: s1Id,
    domain: 'stripe.com',
    email: 'sarah.jenkins@stripe.com',
    pattern: 'first.last',
    generatedBy: 'pattern_code',
    rank: 1,
    confidenceScore: 0.95,
    rationale: 'Matches exact OAuth input',
    verificationStatus: 'valid',
    verificationProvider: 'hunter',
    verifiedAt: new Date(s1Date.getTime() + 30 * 1000),
  });

  const c2 = await EmailCandidate.create({
    sessionId: s1Id,
    domain: 'stripe.com',
    email: 'sjenkins@stripe.com',
    pattern: 'flast',
    generatedBy: 'mistral',
    rank: 2,
    confidenceScore: 0.65,
    rationale: 'Alternative fallback pattern',
    verificationStatus: 'risky',
    verificationProvider: 'hunter',
    verifiedAt: new Date(s1Date.getTime() + 35 * 1000),
  });

  await VerifiedEmail.create({
    sessionId: s1Id,
    candidateId: c1._id,
    email: 'sarah.jenkins@stripe.com',
    domain: 'stripe.com',
    verificationProvider: 'hunter',
    verificationStatus: 'valid',
    mxValid: true,
    smtpAccepted: true,
    isCatchAll: false,
    isDisposable: false,
    confidenceScore: 0.98,
    sourceType: 'oauth',
    personName: 'Sarah Jenkins',
    companyName: 'Stripe',
    lastCheckedAt: new Date(s1Date.getTime() + 30 * 1000),
  });

  const jobs = ['ip_enrichment', 'identity_lookup', 'company_enrichment', 'domain_discovery', 'email_generation', 'email_verification'] as const;
  for (const t of jobs) {
    await PipelineJob.create({
      sessionId: s1Id,
      jobType: t,
      status: 'complete',
      attempt: 1,
      maxAttempts: 3,
      startedAt: s1Date,
      completedAt: new Date(s1Date.getTime() + 5000),
      durationMs: 5000,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Session 2: In Progress (Vercel)
  // ───────────────────────────────────────────────────────────────────────────
  const s2Id = 'sess_vercel_inprogress_002';
  const s2Date = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago

  await VisitorSession.create({
    sessionId: s2Id,
    ip: '76.76.21.21',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    language: 'en-US',
    timezone: 'America/New_York',
    screenWidth: 1920,
    screenHeight: 1080,
    landingUrl: 'http://localhost:3000/docs',
    geoPermissionGranted: true,
    oauthProvider: null,
    manualName: 'Guillermo Rauch',
    manualCompanyUrl: 'vercel.com',
    pipelineStatus: 'domain_discovery',
    lawfulBasisEstablished: true,
    resolvedCompanyDomain: 'vercel.com',
    resolvedCompanyName: 'Vercel',
    resolvedPersonName: 'Guillermo Rauch',
    finalVerifiedEmailCount: 0,
    pipelineStartedAt: s2Date,
    createdAt: s2Date,
  });

  await Consent.create({
    sessionId: s2Id,
    consentTextVersion: 'v1.0',
    grantedScopes: ['ip_enrichment', 'email_discovery', 'company_enrichment'],
    ip: '76.76.21.21',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    jurisdictionHint: 'general',
    timestamp: s2Date,
  });

  await IpEnrichment.create({
    sessionId: s2Id,
    ip: '76.76.21.21',
    provider: 'ipapi.is',
    countryCode: 'US',
    countryName: 'United States',
    regionName: 'New York',
    city: 'New York',
    org: 'Vercel, Inc.',
    isProxy: false,
    isVpn: false,
    isDatacenter: true,
    rawResponse: {},
    confidenceScore: 1.0,
    resolutionStatus: 'resolved',
  });

  await CompanyProfile.create({
    sessionId: s2Id,
    domain: 'vercel.com',
    companyName: 'Vercel',
    industry: 'Technology',
    employeeCount: 450,
    linkedinUrl: 'https://www.linkedin.com/company/vercel',
    country: 'US',
    city: 'New York',
    source: 'apollo',
    rawResponse: {},
    confidenceScore: 0.9,
  });

  await PipelineJob.create({
    sessionId: s2Id,
    jobType: 'ip_enrichment',
    status: 'complete',
    startedAt: s2Date,
    completedAt: new Date(s2Date.getTime() + 2000),
    durationMs: 2000,
  });

  await PipelineJob.create({
    sessionId: s2Id,
    jobType: 'identity_lookup',
    status: 'complete',
    startedAt: new Date(s2Date.getTime() + 2000),
    completedAt: new Date(s2Date.getTime() + 4000),
    durationMs: 2000,
  });

  await PipelineJob.create({
    sessionId: s2Id,
    jobType: 'company_enrichment',
    status: 'complete',
    startedAt: new Date(s2Date.getTime() + 4000),
    completedAt: new Date(s2Date.getTime() + 6000),
    durationMs: 2000,
  });

  await PipelineJob.create({
    sessionId: s2Id,
    jobType: 'domain_discovery',
    status: 'running',
    startedAt: new Date(s2Date.getTime() + 6000),
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Session 3: Failed (Netflix)
  // ───────────────────────────────────────────────────────────────────────────
  const s3Id = 'sess_netflix_failed_003';
  const s3Date = new Date(now.getTime() - 24 * 3600 * 1000); // 24 hours ago

  await VisitorSession.create({
    sessionId: s3Id,
    ip: '69.53.236.17',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
    pipelineStatus: 'failed',
    manualName: 'Reed Hastings',
    manualCompanyUrl: 'netflix.com',
    lawfulBasisEstablished: true,
    resolvedCompanyDomain: 'netflix.com',
    resolvedCompanyName: 'Netflix',
    pipelineStartedAt: s3Date,
    pipelineCompletedAt: new Date(s3Date.getTime() + 8000),
    createdAt: s3Date,
  });

  await Consent.create({
    sessionId: s3Id,
    consentTextVersion: 'v1.0',
    grantedScopes: ['ip_enrichment', 'email_discovery'],
    jurisdictionHint: 'general',
    timestamp: s3Date,
  });

  await PipelineJob.create({
    sessionId: s3Id,
    jobType: 'ip_enrichment',
    status: 'complete',
    startedAt: s3Date,
    completedAt: new Date(s3Date.getTime() + 1000),
  });

  await PipelineJob.create({
    sessionId: s3Id,
    jobType: 'identity_lookup',
    status: 'failed',
    startedAt: new Date(s3Date.getTime() + 1000),
    completedAt: new Date(s3Date.getTime() + 3000),
    errorMessage: 'Apollo.io rate limit exceeded (HTTP 429)',
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Session 4: Anonymous Start (IP Enrichment Only)
  // ───────────────────────────────────────────────────────────────────────────
  const s4Id = 'sess_anon_enrich_004';
  const s4Date = new Date(now.getTime() - 1 * 3600 * 1000); // 1 hour ago

  await VisitorSession.create({
    sessionId: s4Id,
    ip: '8.8.8.8',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
    pipelineStatus: 'complete',
    lawfulBasisEstablished: false, // IP enrichment only, no lawful identity details provided
    resolvedCompanyName: 'Google LLC',
    resolvedCompanyDomain: 'google.com',
    finalVerifiedEmailCount: 0,
    pipelineStartedAt: s4Date,
    pipelineCompletedAt: new Date(s4Date.getTime() + 3000),
    createdAt: s4Date,
  });

  await Consent.create({
    sessionId: s4Id,
    consentTextVersion: 'v1.0',
    grantedScopes: ['ip_enrichment'],
    timestamp: s4Date,
  });

  await IpEnrichment.create({
    sessionId: s4Id,
    ip: '8.8.8.8',
    provider: 'ip-api.com',
    countryCode: 'US',
    countryName: 'United States',
    regionName: 'California',
    city: 'Mountain View',
    org: 'Google LLC',
    isProxy: false,
    isVpn: false,
    isDatacenter: true,
    rawResponse: {},
    confidenceScore: 1.0,
    resolutionStatus: 'resolved',
  });

  await PipelineJob.create({
    sessionId: s4Id,
    jobType: 'ip_enrichment',
    status: 'complete',
    startedAt: s4Date,
    completedAt: new Date(s4Date.getTime() + 3000),
  });

  const skippedJobs = ['identity_lookup', 'company_enrichment', 'domain_discovery', 'email_generation', 'email_verification'] as const;
  for (const t of skippedJobs) {
    await PipelineJob.create({
      sessionId: s4Id,
      jobType: t,
      status: 'skipped',
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Session 5: Consent Stored (No bootstrap yet)
  // ───────────────────────────────────────────────────────────────────────────
  const s5Id = 'sess_consent_stored_005';
  const s5Date = new Date(now.getTime() - 2 * 60 * 1000); // 2 mins ago

  await VisitorSession.create({
    sessionId: s5Id,
    ip: '192.168.1.1',
    pipelineStatus: 'consent_stored',
    lawfulBasisEstablished: false,
    createdAt: s5Date,
  });

  await Consent.create({
    sessionId: s5Id,
    consentTextVersion: 'v1.0',
    grantedScopes: ['ip_enrichment', 'email_discovery'],
    timestamp: s5Date,
  });

  console.log('Database seeding successfully completed.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Database seeding failed:', err);
  process.exit(1);
});
