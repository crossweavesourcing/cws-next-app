/**
 * Repair script: fixes corrupted ObjectId fields in the products collection.
 *
 * The previous migration serialised BSON ObjectIds as plain `{ buffer: { '0': n, ... } }`
 * objects instead of proper ObjectId instances. This script reconstructs the correct
 * ObjectId from the raw buffer bytes and updates each affected document.
 *
 * Run: node scripts/repair-objectids.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

function rebuildObjectId(corrupted) {
  // The corrupted value looks like: { buffer: { '0': 106, '1': 92, ... } }
  if (!corrupted || typeof corrupted !== 'object') return null;
  const buf = corrupted.buffer;
  if (!buf || typeof buf !== 'object') return null;
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) {
    if (buf[String(i)] === undefined) return null;
    bytes[i] = buf[String(i)];
  }
  return new ObjectId(Buffer.from(bytes));
}

function isCorruptedObjectId(value) {
  if (!value || typeof value !== 'object') return false;
  if (value._bsontype === 'ObjectId') return false;
  if (Buffer.isBuffer(value)) return false;
  // Detect { buffer: { '0': n, ... } } shape
  return value.buffer && typeof value.buffer === 'object' && value.buffer['0'] !== undefined;
}

async function main() {
  const uri    = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    console.error('MONGODB_URI and MONGODB_DB_NAME must be set in .env');
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db     = client.db(dbName);

  console.log(`\n🔧 Repairing corrupted ObjectId fields in "${dbName}"...\n`);

  // ── Products: fix categoryId and relatedProducts[] ────────────────────────
  const products = await db.collection('products').find({}).toArray();
  let productFixed = 0;

  for (const product of products) {
    const updates = {};

    // Fix categoryId
    if (isCorruptedObjectId(product.categoryId)) {
      const fixed = rebuildObjectId(product.categoryId);
      if (fixed) {
        updates.categoryId = fixed;
        console.log(`  products → ${product.slug}: categoryId fixed → ${fixed.toHexString()}`);
      }
    }

    // Fix relatedProducts[]
    if (Array.isArray(product.relatedProducts) && product.relatedProducts.length > 0) {
      const fixedRelated = product.relatedProducts.map(id => {
        if (isCorruptedObjectId(id)) {
          const fixed = rebuildObjectId(id);
          return fixed || id;
        }
        return id;
      });
      const changed = fixedRelated.some((v, i) => {
        const orig = product.relatedProducts[i];
        return isCorruptedObjectId(orig);
      });
      if (changed) {
        updates.relatedProducts = fixedRelated;
        console.log(`  products → ${product.slug}: relatedProducts fixed`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('products').updateOne(
        { _id: product._id },
        { $set: updates }
      );
      productFixed++;
    }
  }

  console.log(`\n  ✅ products: ${productFixed} documents repaired\n`);

  // ── catalog_documents: fix categoryId, productId, createdBy, updatedBy ───
  const catalogs = await db.collection('catalog_documents').find({}).toArray();
  let catalogFixed = 0;

  for (const doc of catalogs) {
    const updates = {};
    for (const field of ['categoryId', 'productId', 'createdBy', 'updatedBy']) {
      if (isCorruptedObjectId(doc[field])) {
        const fixed = rebuildObjectId(doc[field]);
        if (fixed) {
          updates[field] = fixed;
          console.log(`  catalog_documents → ${doc.slug}: ${field} fixed → ${fixed.toHexString()}`);
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.collection('catalog_documents').updateOne({ _id: doc._id }, { $set: updates });
      catalogFixed++;
    }
  }

  console.log(`  ✅ catalog_documents: ${catalogFixed} documents repaired\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = productFixed + catalogFixed;
  if (total === 0) {
    console.log('  ℹ️  No corrupted ObjectIds found — database looks healthy.\n');
  } else {
    console.log(`\n🎉 Done. ${total} documents repaired.\n`);
  }

  await client.close();
}

main().catch(err => {
  console.error('❌ Repair failed:', err);
  process.exit(1);
});
