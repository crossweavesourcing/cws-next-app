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
// via collMod (not dropped). Existing indexes are left intact.
//
// This file has NO side effects: no process.exit(), no console output,
// no connection teardown. That is the responsibility of the CLI wrapper.
// ─────────────────────────────────────────────────────────────────────────────

export type CollectionAction = 'created' | 'updated';

export interface CollectionReport {
  collection:   CollectionName;
  action:       CollectionAction;
  indexesAdded: number;
}

export interface InitReport {
  collections: CollectionReport[];
  totalCreated:  number;
  totalUpdated:  number;
  totalIndexes:  number;
  durationMs:    number;
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
 *   - createIndexes (idempotent — driver skips existing indexes)
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

    // ── Create indexes (idempotent) ────────────────────────────────────────
    let indexesAdded = 0;
    if (indexes.length > 0) {
      const coll = db.collection(collName);
      await coll.createIndexes(indexes);
      indexesAdded = indexes.length;
    }

    reports.push({ collection: collName, action, indexesAdded });
  }

  const totalCreated = reports.filter(r => r.action === 'created').length;
  const totalUpdated = reports.filter(r => r.action === 'updated').length;
  const totalIndexes = reports.reduce((sum, r) => sum + r.indexesAdded, 0);

  return {
    collections: reports,
    totalCreated,
    totalUpdated,
    totalIndexes,
    durationMs: Date.now() - t0,
  };
}
