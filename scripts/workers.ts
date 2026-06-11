// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Standalone Worker Runner Script
// ─────────────────────────────────────────────────────────────────────────────

import { loadEnvConfig } from '@next/env';

// Load environment variables
loadEnvConfig(process.cwd(), true);

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[SIGNAL Workers] Shutting down workers...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[SIGNAL Workers] Shutting down workers...');
  process.exit(0);
});

// Boot all workers dynamically so environment variables are loaded first
import('../lib/queue/workers/index').then(() => {
  console.log('[SIGNAL Workers] BullMQ workers running. Press Ctrl+C to terminate.');
}).catch((err) => {
  console.error('[SIGNAL Workers] Failed to boot workers:', err);
  process.exit(1);
});
