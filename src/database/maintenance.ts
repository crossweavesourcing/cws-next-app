import { getDb } from '@/database/client';
import { COLLECTION_NAMES, type CollectionName } from '@/database/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Database Maintenance Utilities
//
// Operational tools for long-running collections.
// CALL FROM: cron jobs, admin scripts, maintenance CLI — NOT from request handlers.
// ─────────────────────────────────────────────────────────────────────────────

// ── Audit Log Archival ────────────────────────────────────────────────────────

export interface ArchiveOptions {
  /** Documents older than this date will be archived. */
  olderThan:          Date;
  /** Documents are processed in batches to avoid large in-memory arrays. Default: 500 */
  batchSize?:         number;
  /** Collection to write archived documents into. Default: 'audit_logs_archive' */
  archiveCollection?: string;
  /**
   * When true, counts matching documents but does not move them.
   * Use to preview before committing.
   */
  dryRun?:            boolean;
}

export interface ArchiveResult {
  scanned:    number;
  archived:   number;
  errors:     number;
  durationMs: number;
  dryRun:     boolean;
}

/**
 * Archives audit_logs documents older than `options.olderThan` to a cold
 * collection (`audit_logs_archive` by default).
 *
 * Uses batched insertMany + deleteMany to avoid large transactions.
 * Documents are inserted into the archive before being deleted from the
 * hot collection — safe to interrupt and resume.
 *
 * Audit log growth management strategy (apply in order):
 *   1. TTL index (90d, always active) — handles common case automatically
 *   2. archiveAuditLogs() nightly — preserves docs before TTL deletes them
 *   3. Reduce TTL via collMod — only after archival is confirmed
 *   4. audit_logs_archive — cold storage, minimal indexes (_id + createdAt)
 */
export async function archiveAuditLogs(options: ArchiveOptions): Promise<ArchiveResult> {
  const db              = await getDb();
  const batchSize       = options.batchSize ?? 500;
  const archiveName     = options.archiveCollection ?? 'audit_logs_archive';
  const dryRun          = options.dryRun ?? false;

  const hotColl     = db.collection(COLLECTION_NAMES.AUDIT_LOGS);
  const archiveColl = db.collection(archiveName);

  const filter = { createdAt: { $lt: options.olderThan } };

  const t0       = Date.now();
  let scanned    = 0;
  let archived   = 0;
  let errors     = 0;

  if (dryRun) {
    scanned = await hotColl.countDocuments(filter);
    return { scanned, archived: 0, errors: 0, durationMs: Date.now() - t0, dryRun: true };
  }

  let hasMore = true;
  while (hasMore) {
    const batch = await hotColl.find(filter).limit(batchSize).toArray();
    if (batch.length === 0) { hasMore = false; break; }

    scanned += batch.length;

    try {
      await archiveColl.insertMany(batch, { ordered: false });
      const ids   = batch.map(d => d._id);
      await hotColl.deleteMany({ _id: { $in: ids } });
      archived += batch.length;
    } catch {
      errors += batch.length;
    }
  }

  return { scanned, archived, errors, durationMs: Date.now() - t0, dryRun: false };
}

// ── Manual TTL Enforcement ────────────────────────────────────────────────────

export type PruneResult = Partial<Record<CollectionName, number>>;

/**
 * Manually deletes documents past their TTL fields.
 * MongoDB's TTL monitor runs every 60s — this provides immediate cleanup.
 *
 * Targets:
 *   refresh_tokens      → expiresAt
 *   verification_tokens → expiresAt
 *   otp_codes           → expiresAt
 *   login_attempts      → createdAt (24h TTL)
 *   audit_logs          → createdAt (90d TTL)
 */
export async function pruneExpiredDocuments(): Promise<PruneResult> {
  const db  = await getDb();
  const now = new Date();
  const result: PruneResult = {};

  const tasks: Array<{ coll: CollectionName; filter: object }> = [
    { coll: COLLECTION_NAMES.REFRESH_TOKENS,      filter: { expiresAt: { $lte: now } } },
    { coll: COLLECTION_NAMES.VERIFICATION_TOKENS, filter: { expiresAt: { $lte: now } } },
    { coll: COLLECTION_NAMES.OTP_CODES,           filter: { expiresAt: { $lte: now } } },
    {
      coll: COLLECTION_NAMES.LOGIN_ATTEMPTS,
      filter: { createdAt: { $lte: new Date(now.getTime() - 86_400_000) } }, // 24h
    },
    {
      coll: COLLECTION_NAMES.AUDIT_LOGS,
      filter: { createdAt: { $lte: new Date(now.getTime() - 7_776_000_000) } }, // 90d
    },
  ];

  await Promise.all(
    tasks.map(async ({ coll, filter }) => {
      const res = await db.collection(coll).deleteMany(filter);
      result[coll] = res.deletedCount;
    }),
  );

  return result;
}

// ── Collection Stats ──────────────────────────────────────────────────────────

export interface CollectionStat {
  collection:      CollectionName;
  documentCount:   number;
  sizeBytes:       number;
  avgDocSizeBytes: number;
  indexSizeBytes:  number;
}

/**
 * Returns document count, storage size, and index size for all 11 collections.
 * Used by monitoring dashboards and the db:init script post-run report.
 */
export async function getCollectionStats(): Promise<CollectionStat[]> {
  const db     = await getDb();
  const colls  = Object.values(COLLECTION_NAMES) as CollectionName[];

  const stats = await Promise.all(
    colls.map(async (collection) => {
      try {
        const s = await db.command({ collStats: collection });
        return {
          collection,
          documentCount:   s.count      as number,
          sizeBytes:       s.size       as number,
          avgDocSizeBytes: s.avgObjSize as number,
          indexSizeBytes:  s.totalIndexSize as number,
        };
      } catch {
        // Collection may not exist yet
        return { collection, documentCount: 0, sizeBytes: 0, avgDocSizeBytes: 0, indexSizeBytes: 0 };
      }
    }),
  );

  return stats;
}
