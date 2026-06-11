import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type IdentityCandidateSource =
  | 'oauth'
  | 'user_input'
  | 'apollo'
  | 'hunter'
  | 'snov';

export interface IIdentityCandidate extends Document {
  sessionId: string;
  source: IdentityCandidateSource;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  companyName?: string;
  companyDomain?: string;
  linkedinUrl?: string;
  country?: string;
  confidence: number;
  isDirectEmail: boolean;
  rawResponse: any;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const IdentityCandidateSchema = new Schema<IIdentityCandidate>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['oauth', 'user_input', 'apollo', 'hunter', 'snov'] as const,
      required: true,
    },
    firstName: { type: String },
    lastName: { type: String },
    fullName: { type: String },
    email: { type: String },
    companyName: { type: String },
    companyDomain: { type: String },
    linkedinUrl: { type: String },
    country: { type: String },
    confidence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    isDirectEmail: {
      type: Boolean,
      required: true,
      default: false,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'identity_candidates',
  },
);

// Compound indexes
IdentityCandidateSchema.index({ sessionId: 1, source: 1 });
IdentityCandidateSchema.index({ sessionId: 1, confidence: -1 });
IdentityCandidateSchema.index({ sessionId: 1, createdAt: -1 });
IdentityCandidateSchema.index({ email: 1 });
IdentityCandidateSchema.index({ companyDomain: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const IdentityCandidate: Model<IIdentityCandidate> =
  (mongoose.models.IdentityCandidate as Model<IIdentityCandidate>) ??
  mongoose.model<IIdentityCandidate>('IdentityCandidate', IdentityCandidateSchema);

export default IdentityCandidate;
