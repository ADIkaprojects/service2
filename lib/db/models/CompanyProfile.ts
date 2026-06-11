import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type CompanySource =
  | 'apollo'
  | 'hunter'
  | 'snov'
  | 'serper'
  | 'tavily'
  | 'manual';

export interface ICompanyProfile extends Document {
  sessionId: string;
  domain: string;
  companyName?: string;
  industry?: string;
  employeeCount?: number;
  linkedinUrl?: string;
  country?: string;
  city?: string;
  description?: string;
  source: CompanySource;
  rawResponse: any;
  confidenceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const CompanyProfileSchema = new Schema<ICompanyProfile>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      index: true,
    },
    companyName: { type: String },
    industry: { type: String },
    employeeCount: { type: Number },
    linkedinUrl: { type: String },
    country: { type: String },
    city: { type: String },
    description: { type: String },
    source: {
      type: String,
      enum: ['apollo', 'hunter', 'snov', 'serper', 'tavily', 'manual'] as const,
      required: true,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    collection: 'company_profiles',
  },
);

// Compound indexes
CompanyProfileSchema.index({ sessionId: 1, createdAt: -1 });
CompanyProfileSchema.index({ sessionId: 1, domain: 1 });
CompanyProfileSchema.index({ domain: 1, source: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const CompanyProfile: Model<ICompanyProfile> =
  (mongoose.models.CompanyProfile as Model<ICompanyProfile>) ??
  mongoose.model<ICompanyProfile>('CompanyProfile', CompanyProfileSchema);

export default CompanyProfile;
