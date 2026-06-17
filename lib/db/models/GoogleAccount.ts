import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export interface IGoogleAccount extends Document {
  googleId?: string;
  email: string;
  name?: string;
  picture?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const GoogleAccountSchema = new Schema<IGoogleAccount>(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String },
    picture: { type: String },
    sessionId: { type: String, index: true },
  },
  {
    timestamps: true,
    collection: 'google_accounts',
  },
);

// ---------------------------------------------------------------------------
// Model (hot-reload safe)
// ---------------------------------------------------------------------------
const GoogleAccount: Model<IGoogleAccount> =
  (mongoose.models.GoogleAccount as Model<IGoogleAccount>) ??
  mongoose.model<IGoogleAccount>('GoogleAccount', GoogleAccountSchema);

export default GoogleAccount;
