// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Worker Bootstrapper (Index)
// ─────────────────────────────────────────────────────────────────────────────

// Import all worker files so they register with BullMQ
import './ip-enrichment.worker';
import './identity-lookup.worker';
import './company-enrichment.worker';
import './domain-discovery.worker';
import './email-generation.worker';
import './email-verification.worker';

console.log('[SIGNAL Workers] All 6 workers booted and active');
export const workersActive = true;
