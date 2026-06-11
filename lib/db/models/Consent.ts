import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export interface IConsent extends Document {
  sessionId: string;
  consentTextVersion: string;
  grantedScopes: string[];
  ip?: string;
  userAgent?: string;
  jurisdictionHint: 'gdpr' | 'ccpa' | 'general';
  timestamp: Date;
  privacyPolicyVersion?: string;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const ConsentSchema = new Schema<IConsent>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    consentTextVersion: {
      type: String,
      required: true,
    },
    grantedScopes: {
      type: [String],
      required: true,
      default: [],
    },
    ip: { type: String },
    userAgent: { type: String },
    jurisdictionHint: {
      type: String,
      enum: ['gdpr', 'ccpa', 'general'],
      required: true,
      default: 'general',
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    privacyPolicyVersion: { type: String },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'consents',
  },
);

// Compound indexes
ConsentSchema.index({ sessionId: 1, timestamp: -1 });
ConsentSchema.index({ sessionId: 1, revokedAt: 1 });
ConsentSchema.index({ consentTextVersion: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const Consent: Model<IConsent> =
  (mongoose.models.Consent as Model<IConsent>) ??
  mongoose.model<IConsent>('Consent', ConsentSchema);

export default Consent;
