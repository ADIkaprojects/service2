// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Structured Error Hierarchy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base error class for all SIGNAL-specific errors.
 * Carries a machine-readable `code` and an optional HTTP `statusCode`.
 */
export class SignalError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper prototype chain in transpiled ES5+
    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance / legal gate error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a pipeline step cannot proceed because the required legal basis
 * or consent record is absent.  Callers MUST surface this as a hard stop —
 * no personal enrichment may occur without a resolved consent record.
 */
export class ComplianceError extends SignalError {
  public readonly missingScopes?: string[];

  constructor(
    message: string,
    missingScopes?: string[],
    context?: Record<string, unknown>,
  ) {
    super(message, 'COMPLIANCE_ERROR', 451 /* Unavailable For Legal Reasons */, true, context);
    this.missingScopes = missingScopes;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a rate limit is exceeded, either for an external service API
 * quota or the platform's own per-IP session rate limit.
 */
export class RateLimitError extends SignalError {
  public readonly retryAfterSeconds?: number;
  public readonly limitType: 'platform' | 'service';

  constructor(
    message: string,
    limitType: 'platform' | 'service' = 'platform',
    retryAfterSeconds?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, context);
    this.limitType = limitType;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service unavailable error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a downstream service (Apollo, Hunter, ipapi.is, etc.) is
 * temporarily unavailable, returns an unexpected 5xx, or times out.
 */
export class ServiceUnavailableError extends SignalError {
  public readonly serviceName: string;
  public readonly retryable: boolean;

  constructor(
    serviceName: string,
    message: string,
    retryable = true,
    context?: Record<string, unknown>,
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, true, context);
    this.serviceName = serviceName;
    this.retryable = retryable;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when request input fails validation (e.g. malformed IP, invalid
 * session ID format, missing required fields).
 */
export class ValidationError extends SignalError {
  public readonly field?: string;
  public readonly receivedValue?: unknown;

  constructor(
    message: string,
    field?: string,
    receivedValue?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, {
      ...context,
      ...(field !== undefined ? { field } : {}),
      ...(receivedValue !== undefined ? { receivedValue } : {}),
    });
    this.field = field;
    this.receivedValue = receivedValue;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent not found error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a pipeline operation is attempted for a session that has no
 * stored consent record.  This is distinct from ComplianceError — it signals
 * a missing record rather than an insufficient scope.
 */
export class ConsentNotFoundError extends SignalError {
  public readonly sessionId: string;

  constructor(sessionId: string, context?: Record<string, unknown>) {
    super(
      `No consent record found for session "${sessionId}". The pipeline cannot proceed without a valid consent record.`,
      'CONSENT_NOT_FOUND',
      404,
      true,
      context,
    );
    this.sessionId = sessionId;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guard helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isSignalError(err: unknown): err is SignalError {
  return err instanceof SignalError;
}

export function isComplianceError(err: unknown): err is ComplianceError {
  return err instanceof ComplianceError;
}

export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError;
}

export function isServiceUnavailableError(err: unknown): err is ServiceUnavailableError {
  return err instanceof ServiceUnavailableError;
}

export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError;
}

export function isConsentNotFoundError(err: unknown): err is ConsentNotFoundError {
  return err instanceof ConsentNotFoundError;
}
