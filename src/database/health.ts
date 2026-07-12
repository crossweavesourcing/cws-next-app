import { getDb } from '@/database/client';
import { getDatabaseConfig } from '@/database/config';

// ─────────────────────────────────────────────────────────────────────────────
// Database Health Check
// ─────────────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  /** Overall status. */
  status:      HealthStatus;
  /** Database name from config. */
  database:    string;
  /** Whether the ping command succeeded. */
  ping:        boolean;
  /** Round-trip latency for the ping command in milliseconds. */
  latencyMs:   number;
  /**
   * Number of collections found in the database.
   * 0 = database exists but not initialized (degraded).
   */
  collections: number;
  checkedAt:   Date;
  /** Present only when status !== 'healthy'. */
  error?:      string;
}

/**
 * Runs a lightweight health check against the MongoDB database.
 *
 * Status logic:
 *   healthy   = ping OK + expected number of collections present
 *   degraded  = ping OK + collections missing or fewer than expected (not initialized)
 *   unhealthy = ping failed or any error
 *
 * Usage:
 *   - Kubernetes readiness probe → /api/health route
 *   - Admin dashboard DB status widget
 *   - Pre/post validation in scripts/db-init.ts
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const config   = getDatabaseConfig();
  const checkedAt = new Date();
  const t0       = Date.now();

  try {
    const db = await getDb();

    // Ping the primary
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - t0;

    // Count collections as a proxy for initialization state
    const colls      = await db.listCollections().toArray();
    const collections = colls.length;

    const EXPECTED_COLLECTIONS = 11;

    let status: HealthStatus;
    if (collections >= EXPECTED_COLLECTIONS) {
      status = 'healthy';
    } else {
      // Ping succeeded but database is not fully initialized
      status = 'degraded';
    }

    return { status, database: config.dbName, ping: true, latencyMs, collections, checkedAt };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const error = err instanceof Error ? err.message : String(err);
    return {
      status:      'unhealthy',
      database:    config.dbName,
      ping:        false,
      latencyMs,
      collections: 0,
      checkedAt,
      error,
    };
  }
}
