import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type RawSignalType =
  | 'ip'
  | 'geolocation'
  | 'browser'
  | 'utm'
  | 'oauth'
  | 'manual';

export interface IRawSignal extends Document {
  sessionId: string;
  signalType: RawSignalType;
  rawPayload: mongoose.Types.Map<unknown>;
  collectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const RawSignalSchema = new Schema<IRawSignal>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    signalType: {
      type: String,
      enum: ['ip', 'geolocation', 'browser', 'utm', 'oauth', 'manual'] as const,
      required: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    collectedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'raw_signals',
  },
);

// Compound indexes
RawSignalSchema.index({ sessionId: 1, signalType: 1 });
RawSignalSchema.index({ sessionId: 1, collectedAt: -1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const RawSignal: Model<IRawSignal> =
  (mongoose.models.RawSignal as Model<IRawSignal>) ??
  mongoose.model<IRawSignal>('RawSignal', RawSignalSchema);

export default RawSignal;
