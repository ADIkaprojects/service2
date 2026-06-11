import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type IpResolutionStatus =
  | 'resolved'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'pending';

export interface IIpEnrichment extends Document {
  sessionId: string;
  ip: string;
  provider: string;
  rawResponse: any;

  // Geo
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  city?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  timezone?: string;

  // Network
  isp?: string;
  org?: string;
  asn?: string;

  // Company resolution
  companyName?: string;
  companyDomain?: string;

  // Risk flags
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;

  // Quality
  confidenceScore: number;
  resolutionStatus: IpResolutionStatus;

  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const IpEnrichmentSchema = new Schema<IIpEnrichment>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // Geo
    countryCode: { type: String },
    countryName: { type: String },
    regionName: { type: String },
    city: { type: String },
    postalCode: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    timezone: { type: String },

    // Network
    isp: { type: String },
    org: { type: String },
    asn: { type: String },

    // Company
    companyName: { type: String },
    companyDomain: { type: String },

    // Risk flags
    isVpn: { type: Boolean, required: true, default: false },
    isProxy: { type: Boolean, required: true, default: false },
    isDatacenter: { type: Boolean, required: true, default: false },

    // Quality
    confidenceScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    resolutionStatus: {
      type: String,
      enum: ['resolved', 'partial', 'failed', 'skipped', 'pending'] as const,
      required: true,
      default: 'pending',
    },
  },
  {
    timestamps: true,
    collection: 'ip_enrichments',
  },
);

// Compound indexes
IpEnrichmentSchema.index({ sessionId: 1, createdAt: -1 });
IpEnrichmentSchema.index({ ip: 1, provider: 1 });
IpEnrichmentSchema.index({ companyDomain: 1 });
IpEnrichmentSchema.index({ resolutionStatus: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const IpEnrichment: Model<IIpEnrichment> =
  (mongoose.models.IpEnrichment as Model<IIpEnrichment>) ??
  mongoose.model<IIpEnrichment>('IpEnrichment', IpEnrichmentSchema);

export default IpEnrichment;
