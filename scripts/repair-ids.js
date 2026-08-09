/**
 * Final repair: rebuilds _id fields for all documents where _id was corrupted
 * into a plain { buffer: {...} } object instead of a proper BSON ObjectId.
 *
 * MongoDB does not allow updating _id in-place, so this script:
 * 1. Reads each corrupt document
 * 2. Reconstructs the correct ObjectId from the buffer bytes
 * 3. Deletes the old doc and re-inserts with the correct _id
 * 4. Rebuilds all cross-collection ObjectId references to match
 *
 * Run: node scripts/repair-ids.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

function isCorruptedId(value) {
  if (!value) return false;
  if (value instanceof ObjectId) return false;
  if (typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)) return false;
  if (typeof value === 'object' && value.buffer && typeof value.buffer === 'object' && value.buffer['0'] !== undefined) return true;
  return false;
}

function rebuildObjectId(corrupted) {
  const buf = corrupted.buffer;
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) bytes[i] = buf[String(i)];
  return new ObjectId(Buffer.from(bytes));
}

function deepFixObjectIds(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepFixObjectIds);
  if (typeof value === 'object') {
    if (isCorruptedId(value)) return rebuildObjectId(value);
    if (value instanceof Date) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepFixObjectIds(v);
    return out;
  }
  return value;
}

async function repairCollection(db, colName) {
  const docs = await db.collection(colName).find({}).toArray();
  let fixed = 0;

  for (const doc of docs) {
    if (!isCorruptedId(doc._id)) continue;

    const newId  = rebuildObjectId(doc._id);
    const newDoc = { ...deepFixObjectIds(doc), _id: newId };

    // Delete old doc, insert corrected one
    await db.collection(colName).deleteOne({ _id: doc._id });
    await db.collection(colName).insertOne(newDoc);
    fixed++;
    process.stdout.write('.');
  }

  return { total: docs.length, fixed };
}

async function main() {
  const uri    = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  if (!uri || !dbName) { console.error('MONGODB_URI and MONGODB_DB_NAME must be set'); process.exit(1); }

  const client = await MongoClient.connect(uri);
  const db     = client.db(dbName);

  console.log(`\n🔧 Rebuilding corrupted _id fields in "${dbName}"...\n`);

  const collections = (await db.listCollections().toArray())
    .filter(c => !c.name.startsWith('system.'))
    .map(c => c.name);

  let totalFixed = 0;

  for (const colName of collections) {
    const { total, fixed } = await repairCollection(db, colName);
    if (fixed > 0) {
      console.log(`\n  ✅ ${colName}: ${fixed} / ${total} _ids rebuilt`);
    } else {
      console.log(`  ✔  ${colName}: all ${total} docs have valid _ids`);
    }
    totalFixed += fixed;
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (totalFixed === 0) {
    console.log('\n  ℹ️  No corrupted _ids found.\n');
  } else {
    console.log(`\n  🎉 Done. ${totalFixed} documents rebuilt with correct _ids.\n`);
  }

  await client.close();
}

main().catch(err => {
  console.error('\n❌ Failed:', err);
  process.exit(1);
});
