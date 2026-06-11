// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Lazy-loaded, type-safe configuration
//
// ALL environment variable access MUST go through this module.
// Getters are used so validation only fires when a value is actually read,
// not at module import time (which can happen in RSC build context before
// .env.local has been loaded).
// ─────────────────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported config object — use getters for REQUIRED vars, direct calls for
// OPTIONAL vars so the shape is always consistent.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  get mongodb() {
    return {
      uri: requireEnv('MONGODB_URI'),
    };
  },

  get redis() {
    return {
      url: requireEnv('REDIS_URL'),
    };
  },

  get nextAuth() {
    return {
      secret: requireEnv('NEXTAUTH_SECRET'),
      url: requireEnv('NEXTAUTH_URL'),
    };
  },

  // ── External service API keys (all optional — absence means feature skipped) ─
  services: {
    get ipapiIs() {
      return optionalEnv('IPAPI_IS_KEY');
    },
    get apollo() {
      return optionalEnv('APOLLO_API_KEY');
    },
    get hunter() {
      return optionalEnv('HUNTER_API_KEY');
    },
    get snovClientId() {
      return optionalEnv('SNOV_CLIENT_ID');
    },
    get snovClientSecret() {
      return optionalEnv('SNOV_CLIENT_SECRET');
    },
    get serper() {
      return optionalEnv('SERPER_API_KEY');
    },
    get tavily() {
      return optionalEnv('TAVILY_API_KEY');
    },
    get mistral() {
      return optionalEnv('MISTRAL_API_KEY');
    },
    get verifalia() {
      return {
        username: optionalEnv('VERIFALIA_USERNAME'),
        password: optionalEnv('VERIFALIA_PASSWORD'),
      };
    },
  },

  // ── Pipeline tuning ─────────────────────────────────────────────────────────
  pipeline: {
    get rateLimitWindowSeconds() {
      return parseInt(optionalEnv('PIPELINE_RATE_LIMIT_WINDOW_SECONDS', '300'), 10);
    },
    get maxSessionsPerIp() {
      return parseInt(optionalEnv('PIPELINE_MAX_SESSIONS_PER_IP', '1'), 10);
    },
    get consentTextVersion() {
      return optionalEnv('CONSENT_TEXT_VERSION', 'v1.0');
    },
    get verifiedEmailMinConfidence() {
      return parseFloat(optionalEnv('VERIFIED_EMAIL_MIN_CONFIDENCE', '0.75'));
    },
    get catchAllMinConfidence() {
      return parseFloat(optionalEnv('CATCH_ALL_MIN_CONFIDENCE', '0.55'));
    },
    get mistralCandidateCount() {
      return parseInt(optionalEnv('MISTRAL_CANDIDATE_COUNT', '50'), 10);
    },
  },

  // ── App metadata ─────────────────────────────────────────────────────────────
  app: {
    get url() {
      return optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    },
    get nodeEnv() {
      return optionalEnv('NODE_ENV', 'development') as 'development' | 'test' | 'production';
    },
    get logLevel() {
      return optionalEnv('LOG_LEVEL', 'info');
    },
  },
} as const;
