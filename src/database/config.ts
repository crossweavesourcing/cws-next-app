// ─────────────────────────────────────────────────────────────────────────────
// Database Configuration Validation
//
// Validates all required environment variables at call time (process startup).
// Reports ALL violations in a single error — not just the first.
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabaseConfig {
  readonly uri:    string;
  readonly dbName: string;
}

/** Thrown when one or more database env vars are missing or malformed. */
export class DatabaseConfigError extends Error {
  public readonly violations: string[];

  constructor(violations: string[]) {
    const list = violations.map(v => `  - ${v}`).join('\n');
    super(
      `Database configuration is invalid:\n${list}\n\n` +
      `Set these variables in .env (development) or your deployment environment.\n` +
      `See .env.example for the expected format.`
    );
    this.name = 'DatabaseConfigError';
    this.violations = violations;
  }
}

/** Regex for valid MongoDB database names (MongoDB naming rules). */
const DB_NAME_RE = /^[a-zA-Z0-9_-]{1,38}$/;

/**
 * Validates database environment variables and returns a typed config object.
 *
 * Validations performed:
 *   MONGODB_URI     — present, non-empty, starts with 'mongodb://' or 'mongodb+srv://'
 *   MONGODB_DB_NAME — present, non-empty, matches /^[a-zA-Z0-9_-]{1,38}$/
 *
 * Call once at process startup — not on every request.
 *
 * @throws {DatabaseConfigError} when any variable is missing or invalid.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const violations: string[] = [];

  const uri    = process.env.MONGODB_URI    ?? '';
  const dbName = process.env.MONGODB_DB_NAME ?? '';
  const webhookUrl = process.env.SECURITY_WEBHOOK_URL;

  // ── MONGODB_URI ────────────────────────────────────────────────────────────
  if (!uri) {
    violations.push('MONGODB_URI: environment variable is not set');
  } else if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    violations.push(
      `MONGODB_URI: must start with 'mongodb://' or 'mongodb+srv://' (value redacted)`
    );
  }

  // ── MONGODB_DB_NAME ────────────────────────────────────────────────────────
  if (!dbName) {
    violations.push('MONGODB_DB_NAME: environment variable is not set');
  } else if (!DB_NAME_RE.test(dbName)) {
    violations.push(
      `MONGODB_DB_NAME: must match /^[a-zA-Z0-9_-]{1,38}$/ (got "${dbName}")`
    );
  }

  // ── SECURITY_WEBHOOK_URL ───────────────────────────────────────────────────
  if (webhookUrl) {
    try {
      const parsedUrl = new URL(webhookUrl);
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        violations.push('SECURITY_WEBHOOK_URL: must use https:// in production');
      }
    } catch {
      violations.push('SECURITY_WEBHOOK_URL: must be a valid URL');
    }
  }

  if (violations.length > 0) {
    throw new DatabaseConfigError(violations);
  }

  return { uri, dbName };
}
