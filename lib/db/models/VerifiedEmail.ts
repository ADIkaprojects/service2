import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type VerifiedEmailStatus = 'valid' | 'catch_all_accepted';

export type VerifiedEmailSourceType =
  | 'oauth'
  | 'user_input'
  | 'direct_lookup'
  | 'generated_and_verified';

export interface IVerifiedEmail extends Document {
  sessionId: string;
  candidateId?: Types.ObjectId;
  email: string;
  domain?: string;
  verificationProvider?: string;
  verificationStatus: VerifiedEmailStatus;
  mxValid: boolean;
  smtpAccepted: boolean;
  isCatchAll: boolean;
  isDisposable: boolean;
  confidenceScore: number;
  sourceType: VerifiedEmailSourceType;
  personName?: string;
  companyName?: string;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const VerifiedEmailSchema = new Schema<IVerifiedEmail>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailCandidate',
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
    domain: { type: String },
    verificationProvider: { type: String },
    verificationStatus: {
      type: String,
      enum: ['valid', 'catch_all_accepted'] as const,
      required: true,
    },
    mxValid: { type: Boolean, required: true, default: false },
    smtpAccepted: { type: Boolean, required: true, default: false },
    isCatchAll: { type: Boolean, required: true, default: false },
    isDisposable: { type: Boolean, required: true, default: false },
    confidenceScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    sourceType: {
      type: String,
      enum: [
        'oauth',
        'user_input',
        'direct_lookup',
        'generated_and_verified',
      ] as const,
      required: true,
    },
    personName: { type: String },
    companyName: { type: String },
    lastCheckedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'verified_emails',
  },
);

// Compound indexes
VerifiedEmailSchema.index({ sessionId: 1, verificationStatus: 1 });
VerifiedEmailSchema.index({ sessionId: 1, sourceType: 1 });
VerifiedEmailSchema.index({ sessionId: 1, createdAt: -1 });
VerifiedEmailSchema.index({ email: 1 });
VerifiedEmailSchema.index({ candidateId: 1 });
VerifiedEmailSchema.index({ domain: 1, verificationStatus: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const VerifiedEmail: Model<IVerifiedEmail> =
  (mongoose.models.VerifiedEmail as Model<IVerifiedEmail>) ??
  mongoose.model<IVerifiedEmail>('VerifiedEmail', VerifiedEmailSchema);

export default VerifiedEmail;
