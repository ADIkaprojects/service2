import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type EmailVerificationStatus =
  | 'pending'
  | 'running'
  | 'valid'
  | 'invalid'
  | 'catch_all'
  | 'risky'
  | 'unknown'
  | 'error';

export type EmailGeneratedBy =
  | 'mistral'
  | 'pattern_code'
  | 'direct_lookup';

export interface IEmailCandidate extends Document {
  sessionId: string;
  personId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  domain: string;
  email: string;
  pattern?: string;
  generatedBy: EmailGeneratedBy;
  rank: number;
  confidenceScore: number;
  rationale?: string;
  verificationStatus: EmailVerificationStatus;
  verificationProvider?: string;
  verificationDetail?: any;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const EmailCandidateSchema = new Schema<IEmailCandidate>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    personId: {
      type: Schema.Types.ObjectId,
      ref: 'IdentityCandidate',
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      default: null,
    },
    domain: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    pattern: { type: String },
    generatedBy: {
      type: String,
      enum: ['mistral', 'pattern_code', 'direct_lookup'] as const,
      required: true,
    },
    rank: {
      type: Number,
      required: true,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    rationale: { type: String },
    verificationStatus: {
      type: String,
      enum: [
        'pending',
        'running',
        'valid',
        'invalid',
        'catch_all',
        'risky',
        'unknown',
        'error',
      ] as const,
      required: true,
      default: 'pending',
    },
    verificationProvider: { type: String },
    verificationDetail: { type: Schema.Types.Mixed, default: null },
    verifiedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'email_candidates',
  },
);

// Compound indexes
EmailCandidateSchema.index({ sessionId: 1, verificationStatus: 1 });
EmailCandidateSchema.index({ sessionId: 1, rank: 1 });
EmailCandidateSchema.index({ sessionId: 1, createdAt: -1 });
EmailCandidateSchema.index({ email: 1 });
EmailCandidateSchema.index({ domain: 1, verificationStatus: 1 });
EmailCandidateSchema.index({ personId: 1 });
EmailCandidateSchema.index({ companyId: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const EmailCandidate: Model<IEmailCandidate> =
  (mongoose.models.EmailCandidate as Model<IEmailCandidate>) ??
  mongoose.model<IEmailCandidate>('EmailCandidate', EmailCandidateSchema);

export default EmailCandidate;
