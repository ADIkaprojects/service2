import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export type AuditActor = 'system' | 'user' | 'worker';

export interface IAuditLog extends Document {
  sessionId?: string;
  action: string;
  actor: AuditActor;
  details?: any;
  ip?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const AuditLogSchema = new Schema<IAuditLog>(
  {
    sessionId: {
      type: String,
      index: true,
      default: null,
    },
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: String,
      enum: ['system', 'user', 'worker'] as const,
      required: true,
      default: 'system',
    },
    details: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: { type: String, default: null },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  },
);

// Compound indexes
AuditLogSchema.index({ sessionId: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ timestamp: -1 });

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
