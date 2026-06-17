/**
 * Barrel re-export for all Mongoose models.
 *
 * Import individual models from here to keep imports DRY:
 *   import { VisitorSession, Consent } from '@/lib/db/models';
 *
 * NOTE: Always pair with `connectDB()` before issuing any queries.
 */

export { default as VisitorSession } from './VisitorSession';
export type { IVisitorSession } from './VisitorSession';

export { default as Consent } from './Consent';
export type { IConsent } from './Consent';

export { default as RawSignal } from './RawSignal';
export type { IRawSignal, RawSignalType } from './RawSignal';

export { default as IpEnrichment } from './IpEnrichment';
export type { IIpEnrichment, IpResolutionStatus } from './IpEnrichment';

export { default as CompanyProfile } from './CompanyProfile';
export type { ICompanyProfile, CompanySource } from './CompanyProfile';

export { default as PatternSource } from './PatternSource';
export type { IPatternSource, PatternSourceType } from './PatternSource';

export { default as IdentityCandidate } from './IdentityCandidate';
export type { IIdentityCandidate, IdentityCandidateSource } from './IdentityCandidate';

export { default as EmailCandidate } from './EmailCandidate';
export type {
  IEmailCandidate,
  EmailVerificationStatus,
  EmailGeneratedBy,
} from './EmailCandidate';

export { default as VerifiedEmail } from './VerifiedEmail';
export type {
  IVerifiedEmail,
  VerifiedEmailStatus,
  VerifiedEmailSourceType,
} from './VerifiedEmail';

export { default as PipelineJob } from './PipelineJob';
export type { IPipelineJob, PipelineJobType, PipelineJobStatus } from './PipelineJob';

export { default as AuditLog } from './AuditLog';
export type { IAuditLog, AuditActor } from './AuditLog';

export { default as GoogleAccount } from './GoogleAccount';
export type { IGoogleAccount } from './GoogleAccount';
