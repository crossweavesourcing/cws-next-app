/**
 * Comprehensive repair script: fixes corrupted BSON types in ALL collections.
 *
 * The previous migration serialized BSON values (ObjectId, Date) as plain objects.
 * This script detects and repairs:
 *   - ObjectId → { buffer: { '0': n, ... } }  → rebuilt as proper ObjectId
 *   - Date     → {}  or  { $date: "..." }      → rebuilt as proper Date
 *
 * Run: node scripts/repair-all-bson.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// ─── Type detection helpers ───────────────────────────────────────────────────

function isCorruptedObjectId(value) {
  if (!value || typeof value !== 'object') return false;
  if (value._bsontype === 'ObjectId') return false;
  if (value instanceof ObjectId) return false;
  if (Buffer.isBuffer(value)) return false;
  // { buffer: { '0': n, '1': n, ... } } shape — 12-byte sequence
  if (value.buffer && typeof value.buffer === 'object' && value.buffer['0'] !== undefined) return true;
  return false;
}

function isCorruptedDate(value) {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Date) return false;
  // Stored as {} (empty object — bson Date lost)
  if (Object.keys(value).length === 0) return true;
  // Stored as { $date: "ISO string" } or { $date: { $numberLong: "..." } }
  if (value.$date !== undefined) return true;
  return false;
}

function rebuildObjectId(corrupted) {
  const buf = corrupted.buffer;
  if (!buf || typeof buf !== 'object') return null;
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) {
    if (buf[String(i)] === undefined) return null;
    bytes[i] = buf[String(i)];
  }
  try { return new ObjectId(Buffer.from(bytes)); } catch { return null; }
}

function rebuildDate(corrupted) {
  // Empty object — we can't recover the original timestamp, use epoch as sentinel
  if (Object.keys(corrupted).length === 0) return new Date(0);
  // { $date: "2024-01-01T..." }
  if (typeof corrupted.$date === 'string') return new Date(corrupted.$date);
  // { $date: { $numberLong: "..." } }
  if (corrupted.$date && typeof corrupted.$date.$numberLong === 'string') {
    return new Date(parseInt(corrupted.$date.$numberLong, 10));
  }
  return new Date(0);
}

// ─── Deep repair of any document ─────────────────────────────────────────────

function deepRepair(value, path = '') {
  if (value === null || value === undefined) return { value, changed: false };

  if (Array.isArray(value)) {
    let changed = false;
    const repaired = value.map((item, i) => {
      const result = deepRepair(item, `${path}[${i}]`);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: changed ? repaired : value, changed };
  }

  if (typeof value === 'object') {
    // Detect type before walking children
    if (isCorruptedObjectId(value)) {
      const fixed = rebuildObjectId(value);
      if (fixed) {
        return { value: fixed, changed: true, note: `ObjectId@${path}` };
      }
    }
    if (isCorruptedDate(value)) {
      const fixed = rebuildDate(value);
      return { value: fixed, changed: true, note: `Date@${path}` };
    }

    // Walk children
    let changed = false;
    const repaired = {};
    for (const [k, v] of Object.entries(value)) {
      const result = deepRepair(v, path ? `${path}.${k}` : k);
      repaired[k] = result.value;
      if (result.changed) changed = true;
    }
    return { value: changed ? repaired : value, changed };
  }

  return { value, changed: false };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const uri    = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  if (!uri || !dbName) { console.error('MONGODB_URI and MONGODB_DB_NAME must be set'); process.exit(1); }

  const client = await MongoClient.connect(uri);
  const db     = client.db(dbName);

  console.log(`\n🔧 Deep BSON repair on "${dbName}"...\n`);

  const collections = (await db.listCollections().toArray())
    .filter(c => !c.name.startsWith('system.'))
    .map(c => c.name);

  console.log(`  Found ${collections.length} collections.\n`);

  let totalFixed = 0;

  for (const colName of collections) {
    const docs = await db.collection(colName).find({}).toArray();
    let colFixed = 0;

    for (const doc of docs) {
      // Don't touch _id — MongoDB won't allow updating the primary key
      const { _id, ...rest } = doc;
      const result = deepRepair(rest);

      if (result.changed) {
        await db.collection(colName).replaceOne({ _id }, { _id, ...result.value });
        process.stdout.write('.');
        colFixed++;
      }
    }

    if (colFixed > 0) {
      console.log(`\n  ✅ ${colName}: ${colFixed} / ${docs.length} docs repaired`);
    } else {
      console.log(`  ✔  ${colName}: all ${docs.length} docs clean`);
    }

    totalFixed += colFixed;
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (totalFixed === 0) {
    console.log('\n  ℹ️  No corrupted BSON values found — database is healthy.\n');
  } else {
    console.log(`\n  🎉 Done. ${totalFixed} documents repaired across all collections.\n`);
    console.log('  ⚠️  Note: Any Date fields that were stored as {} (empty object) were');
    console.log('     reset to epoch (1970-01-01). Check products.createdAt / updatedAt');
    console.log('     in the dashboard and update them if needed.\n');
  }

  await client.close();
}

main().catch(err => {
  console.error('\n❌ Repair failed:', err);
  process.exit(1);
});
