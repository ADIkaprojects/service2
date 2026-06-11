// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — MongoDB Connection (Mongoose)
//
// Maintains a single, cached Mongoose connection across hot-reloads in
// development and across serverless invocations in production.
//
// mongoose is in Next.js's built-in serverExternalPackages list, so it is
// always resolved as a native Node.js module — no bundle tricks needed.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'db/connect' });

// In development, Next.js hot-reloads wipe module-level variables, so we
// stash the connection on the Node.js global object to keep it alive.
declare global {
  // eslint-disable-next-line no-var
  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

function getCache() {
  if (!global._mongoose) {
    global._mongoose = { conn: null, promise: null };
  }
  return global._mongoose;
}

export async function connectDB(): Promise<typeof mongoose> {
  const cache = getCache();

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const uri = config.mongodb.uri;

    log.info('Opening new MongoDB connection');

    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 45_000,
      })
      .then((m) => {
        log.info('MongoDB connection established');
        return m;
      })
      .catch((err: unknown) => {
        cache.promise = null;
        log.error({ err }, 'MongoDB connection failed');
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

/**
 * Gracefully close the Mongoose connection.
 * Call this in test teardown or during controlled server shutdown.
 */
export async function disconnectDB(): Promise<void> {
  const cache = getCache();
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
    log.info('MongoDB connection closed');
  }
}
