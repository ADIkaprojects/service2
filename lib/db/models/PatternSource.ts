import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type PatternSourceType =
  | 'hunter_domain_search'
  | 'snov_domain_search'
  | 'serper_discovery'
  | 'tavily_discovery'
  | 'apollo_enrichment';

export interface IPatternSource extends Document {
  sessionId: string;
  domain: string;
  source: PatternSourceType;
  detectedPatterns: string[];
  exampleEmails: string[];
  rawResponse: any;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const PatternSourceSchema = new Schema<IPatternSource>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: [
        'hunter_domain_search',
        'snov_domain_search',
        'serper_discovery',
        'tavily_discovery',
        'apollo_enrichment',
      ] as const,
      required: true,
    },
    detectedPatterns: {
      type: [String],
      default: [],
    },
    exampleEmails: {
      type: [String],
      default: [],
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    collection: 'pattern_sources',
  },
);

// Compound indexes
PatternSourceSchema.index({ sessionId: 1, source: 1 });
PatternSourceSchema.index({ sessionId: 1, domain: 1 });
PatternSourceSchema.index({ domain: 1, source: 1 });
PatternSourceSchema.index({ sessionId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const PatternSource: Model<IPatternSource> =
  (mongoose.models.PatternSource as Model<IPatternSource>) ??
  mongoose.model<IPatternSource>('PatternSource', PatternSourceSchema);

export default PatternSource;
