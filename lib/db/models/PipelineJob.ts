import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type PipelineJobType =
  | 'ip_enrichment'
  | 'identity_lookup'
  | 'company_enrichment'
  | 'domain_discovery'
  | 'email_generation'
  | 'email_verification';

export type PipelineJobStatus =
  | 'queued'
  | 'running'
  | 'complete'
  | 'failed'
  | 'skipped';

export interface IPipelineJob extends Document {
  sessionId: string;
  jobType: PipelineJobType;
  status: PipelineJobStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  attempt: number;
  maxAttempts: number;
  errorMessage?: string;
  errorStack?: string;
  inputData?: mongoose.Types.Map<unknown>;
  outputSummary?: mongoose.Types.Map<unknown>;
  workerName?: string;
  bullJobId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const PipelineJobSchema = new Schema<IPipelineJob>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    jobType: {
      type: String,
      enum: [
        'ip_enrichment',
        'identity_lookup',
        'company_enrichment',
        'domain_discovery',
        'email_generation',
        'email_verification',
      ] as const,
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'complete', 'failed', 'skipped'] as const,
      required: true,
      default: 'queued',
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    attempt: { type: Number, required: true, default: 1 },
    maxAttempts: { type: Number, required: true, default: 3 },
    errorMessage: { type: String, default: null },
    errorStack: { type: String, default: null },
    inputData: { type: Schema.Types.Mixed, default: null },
    outputSummary: { type: Schema.Types.Mixed, default: null },
    workerName: { type: String, default: null },
    bullJobId: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'pipeline_jobs',
  },
);

// Compound indexes
PipelineJobSchema.index({ sessionId: 1, createdAt: -1 });
PipelineJobSchema.index({ sessionId: 1, jobType: 1 });
PipelineJobSchema.index({ status: 1, createdAt: -1 });
PipelineJobSchema.index({ bullJobId: 1 }, { sparse: true });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const PipelineJob: Model<IPipelineJob> =
  (mongoose.models.PipelineJob as Model<IPipelineJob>) ??
  mongoose.model<IPipelineJob>('PipelineJob', PipelineJobSchema);

export default PipelineJob;
