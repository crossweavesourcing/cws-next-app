import type { Db } from 'mongodb';
import { getDb } from '@/database/client';
import { COLLECTION_ORDER, type CollectionName } from '@/database/constants';
import { ALL_SCHEMAS } from '@/database/schemas';
import { ALL_INDEXES } from '@/database/indexes';

// ─────────────────────────────────────────────────────────────────────────────
// Database Initializer — Pure Logic
//
// Creates or updates all 11 collections with:
//   - $jsonSchema validators (validationLevel: strict, validationAction: error)
//   - All indexes from ALL_INDEXES
//
// Idempotent — safe to run multiple times. Existing collections are updated
// via collMod (not dropped). Existing indexes are left intact (createIndexes
// is a no-op for indexes whose definition already matches, and indexes with
// the same name are skipped by the server).
//
// This file has NO side effects: no process.exit(), no console output,
// no connection teardown. That is the responsibility of the CLI wrapper.
// ─────────────────────────────────────────────────────────────────────────────

export type CollectionAction = 'created' | 'updated';

export interface CollectionReport {
  collection:   CollectionName;
  action:       CollectionAction;
  indexesAdded: number;
  /** Index names that failed to build (non-fatal — logged, not thrown). */
  indexErrors:  string[];
}

export interface InitReport {
  collections: CollectionReport[];
  totalCreated:  number;
  totalUpdated:  number;
  totalIndexes:  number;
  durationMs:    number;
  /** True when at least one collection failed index creation. */
  hadIndexErrors: boolean;
}

async function getExistingCollectionNames(db: Db): Promise<Set<string>> {
  const list = await db.listCollections().toArray();
  return new Set(list.map(c => c.name));
}

/**
 * Idempotent database initializer.
 *
 * For each collection in COLLECTION_ORDER:
 *   - If collection does not exist: createCollection with $jsonSchema validator
 *   - If collection exists: collMod to apply updated validator
 *   - createIndexes (idempotent — driver/server skips existing indexes)
 *
 * Index creation is NON-FATAL: a failure on one collection (e.g. a transient
 * serverless cold-start blip, or a partial index conflict) is caught, logged,
 * and recorded in `indexErrors` so it never blocks app boot or abort the rest
 * of initialization. Re-run (deploy step / maintenance job) to heal.
 */
export async function initializeDatabase(): Promise<InitReport> {
  const db  = await getDb();
  const t0  = Date.now();

  const existing = await getExistingCollectionNames(db);
  const reports: CollectionReport[] = [];

  for (const collName of COLLECTION_ORDER) {
    const schema  = ALL_SCHEMAS[collName];
    const indexes = ALL_INDEXES[collName];

    let action: CollectionAction;

    if (!existing.has(collName)) {
      // ── Create new collection ──────────────────────────────────────────────
      await db.createCollection(collName, {
        validator: {
          $jsonSchema: schema,
        },
        validationLevel:  'strict',
        validationAction: 'error',
      });
      action = 'created';
    } else {
      // ── Update validator on existing collection ────────────────────────────
      await db.command({
        collMod:          collName,
        validator:        { $jsonSchema: schema },
        validationLevel:  'strict',
        validationAction: 'error',
      });
      action = 'updated';
    }

    // ── Create indexes (idempotent + non-fatal) ─────────────────────────────
    let indexesAdded = 0;
    const indexErrors: string[] = [];

    if (indexes.length > 0) {
      const coll = db.collection(collName);
      try {
        // createIndexes sends all definitions in one (idempotent) command.
        // The server skips indexes whose name + key already match.
        const result = await coll.createIndexes(indexes);
        // `result` lists the names of indexes that were created/ensured.
        indexesAdded = Array.isArray(result) ? result.length : indexes.length;
      } catch (err) {
        // Partial failure: capture which index names we attempted so the
        // operator can audit. Boot must NOT fail because of index drift.
        indexErrors.push(
          ...indexes.map(i => (i as { name?: string }).name ?? JSON.stringify(i.key)),
        );
        console.error(
          JSON.stringify({
            level:   'error',
            event:   'db.init.index.failed',
            collection: collName,
            error:   err instanceof Error ? err.message : String(err),
            attempted: indexes.map(i => (i as { name?: string }).name ?? JSON.stringify(i.key)),
            ts:      new Date().toISOString(),
          }),
        );
      }
    }

    reports.push({ collection: collName, action, indexesAdded, indexErrors });
  }

  const totalCreated = reports.filter(r => r.action === 'created').length;
  const totalUpdated = reports.filter(r => r.action === 'updated').length;
  const totalIndexes = reports.reduce((sum, r) => sum + r.indexesAdded, 0);
  const hadIndexErrors = reports.some(r => r.indexErrors.length > 0);

  return {
    collections: reports,
    totalCreated,
    totalUpdated,
    totalIndexes,
    durationMs: Date.now() - t0,
    hadIndexErrors,
  };
}
