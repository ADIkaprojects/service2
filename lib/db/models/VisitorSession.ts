import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export interface IVisitorSession extends Document {
  sessionId: string;
  ip?: string;
  userAgent?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  referrer?: string;
  landingUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  geoPermissionGranted: boolean;
  latitude?: number;
  longitude?: number;
  oauthProvider?: 'google' | 'microsoft' | null;
  oauthEmail?: string;
  oauthName?: string;
  manualEmail?: string;
  manualName?: string;
  manualCompanyUrl?: string;
  pipelineStatus: string;
  lawfulBasisEstablished: boolean;
  resolvedCompanyDomain?: string;
  resolvedCompanyName?: string;
  resolvedPersonName?: string;
  finalVerifiedEmailCount: number;
  pipelineStartedAt?: Date;
  pipelineCompletedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const VisitorSessionSchema = new Schema<IVisitorSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ---------- Browser / device signals ----------
    ip: { type: String },
    userAgent: { type: String },
    language: { type: String },
    timezone: { type: String },
    screenWidth: { type: Number },
    screenHeight: { type: Number },
    referrer: { type: String },
    landingUrl: { type: String },

    // ---------- UTM ----------
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },

    // ---------- Geo ----------
    geoPermissionGranted: { type: Boolean, required: true, default: false },
    latitude: { type: Number },
    longitude: { type: Number },

    // ---------- Identity signals ----------
    oauthProvider: {
      type: String,
      enum: ['google', 'microsoft', null],
      default: null,
    },
    oauthEmail: { type: String },
    oauthName: { type: String },
    manualEmail: { type: String },
    manualName: { type: String },
    manualCompanyUrl: { type: String },

    // ---------- Pipeline state ----------
    pipelineStatus: {
      type: String,
      required: true,
      default: 'idle',
    },
    lawfulBasisEstablished: {
      type: Boolean,
      required: true,
      default: false,
    },

    // ---------- Resolution results ----------
    resolvedCompanyDomain: { type: String },
    resolvedCompanyName: { type: String },
    resolvedPersonName: { type: String },
    finalVerifiedEmailCount: { type: Number, default: 0 },

    // ---------- Pipeline timing ----------
    pipelineStartedAt: { type: Date },
    pipelineCompletedAt: { type: Date },

    // ---------- Soft delete ----------
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'visitor_sessions',
  },
);

// Compound indexes
VisitorSessionSchema.index({ pipelineStatus: 1, createdAt: -1 });
VisitorSessionSchema.index({ lawfulBasisEstablished: 1, pipelineStatus: 1 });
VisitorSessionSchema.index({ ip: 1 });
VisitorSessionSchema.index({ oauthEmail: 1 });
VisitorSessionSchema.index({ manualEmail: 1 });
VisitorSessionSchema.index({ deletedAt: 1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const VisitorSession: Model<IVisitorSession> =
  (mongoose.models.VisitorSession as Model<IVisitorSession>) ??
  mongoose.model<IVisitorSession>('VisitorSession', VisitorSessionSchema);

export default VisitorSession;
