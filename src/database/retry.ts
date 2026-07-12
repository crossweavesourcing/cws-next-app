import { MongoNetworkError, MongoNetworkTimeoutError, MongoServerError } from 'mongodb';

// ─────────────────────────────────────────────────────────────────────────────
// Retry Strategy — Exponential Backoff with Jitter
//
// Only retries transient errors. Permanent failures (duplicate key, validation)
// are re-thrown immediately without retrying.
// ─────────────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts:    number;
  /** Initial delay before the first retry in milliseconds. Default: 100 */
  initialDelayMs: number;
  /** Maximum delay cap in milliseconds. Default: 5000 */
  maxDelayMs:     number;
  /** Exponential backoff multiplier. Default: 2.0 */
  backoffFactor:  number;
  /**
   * Jitter factor (0–1). Adds ±jitterFactor×delay randomness.
   * Prevents thundering herd when many clients retry simultaneously.
   * Default: 0.3 (±30%)
   */
  jitterFactor:   number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts:    3,
  initialDelayMs: 100,
  maxDelayMs:     5_000,
  backoffFactor:  2.0,
  jitterFactor:   0.3,
};

/**
 * MongoDB server error codes that indicate transient conditions.
 * These errors are safe to retry.
 */
const RETRYABLE_SERVER_CODES = new Set([
  11600, // InterruptedAtShutdown
  91,    // ShutdownInProgress
  189,   // PrimarySteppedDown
  216,   // ElectionInProgress
  64,    // WriteConcernFailed (transient)
  91,    // ShutdownInProgress
]);

/**
 * Returns true if the error is a transient MongoDB error that is safe to retry.
 * Returns false for permanent errors (duplicate key, validation failure, etc.).
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof MongoNetworkError) return true;
  if (err instanceof MongoNetworkTimeoutError) return true;
  if (err instanceof MongoServerError) {
    const code = typeof err.code === 'number' ? err.code : -1;
    return RETRYABLE_SERVER_CODES.has(code);
  }
  return false;
}

/**
 * Computes the delay for a given attempt using exponential backoff + jitter.
 *
 * Formula:
 *   base  = min(initialDelayMs × backoffFactor^(attempt-1), maxDelayMs)
 *   delay = base × (1 + jitterFactor × (Math.random() * 2 - 1))
 */
function computeDelay(attempt: number, opts: RetryOptions): number {
  const base  = Math.min(
    opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1),
    opts.maxDelayMs,
  );
  const jitter = opts.jitterFactor * (Math.random() * 2 - 1); // range: [-factor, +factor]
  return Math.max(0, Math.round(base * (1 + jitter)));
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes `operation` with automatic retry on transient MongoDB errors.
 *
 * Non-retryable errors (validation failure, duplicate key, etc.) are thrown
 * immediately without consuming retry budget.
 *
 * @param operation A function returning a Promise to retry.
 * @param options   Retry configuration (merged with defaults).
 *
 * @example
 * const result = await withRetry(() => collection.findOne({ _id }));
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isRetryable(err)) throw err;  // permanent error — re-throw immediately

      lastError = err;

      if (attempt < opts.maxAttempts) {
        const delay = computeDelay(attempt, opts);
        console.warn(
          JSON.stringify({
            level:   'warn',
            event:   'db.retry',
            attempt,
            maxAttempts: opts.maxAttempts,
            delayMs: delay,
            error:   err instanceof Error ? err.message : String(err),
            ts:      new Date().toISOString(),
          }),
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
