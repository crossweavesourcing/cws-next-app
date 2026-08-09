import { MongoClient } from 'mongodb';

// Fill in your target (new) MongoDB connection string here:
const NEW_MONGODB_URI = process.env.NEW_MONGODB_URI || 'YOUR_NEW_MONGODB_URI_HERE';

async function migrateData() {
  const sourceUri = process.env.MONGODB_URI;
  if (!sourceUri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  if (NEW_MONGODB_URI === 'YOUR_NEW_MONGODB_URI_HERE') {
    console.error('❌ Please pass NEW_MONGODB_URI or edit the script with your new MongoDB connection string.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME;

  console.log(`🔄 Connecting to source database (${dbName || 'default'})...`);
  const sourceClient = await MongoClient.connect(sourceUri);
  const sourceDb = sourceClient.db(dbName);

  console.log(`🔄 Connecting to target (new) database (${dbName || 'default'})...`);
  const targetClient = await MongoClient.connect(NEW_MONGODB_URI);
  const targetDb = targetClient.db(dbName);

  const collections = await sourceDb.listCollections().toArray();
  console.log(`📦 Found ${collections.length} collections to copy.\n`);

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    console.log(`➡️ Copying collection: ${colName}...`);
    const docs = await sourceDb.collection(colName).find({}).toArray();

    if (docs.length > 0) {
      await targetDb.collection(colName).deleteMany({}); // clear target collection first
      await targetDb.collection(colName).insertMany(docs);
      console.log(`   ✅ Copied ${docs.length} documents.`);
    } else {
      console.log(`   ℹ️ Empty collection, skipped docs copy.`);
    }

    // Copy indexes
    try {
      const indexes = await sourceDb.collection(colName).indexes();
      const nonIdIndexes = indexes.filter(idx => idx.name !== '_id_');
      if (nonIdIndexes.length > 0) {
        // Strip `v` property if present
        const specs = nonIdIndexes.map(({ v, ...rest }) => rest);
        await targetDb.collection(colName).createIndexes(specs as any);
        console.log(`   ✅ Recreated ${nonIdIndexes.length} indexes.`);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Index copy warning for ${colName}:`, err.message);
    }
  }

  console.log('\n🎉 Migration complete! All data and indexes have been copied to the new database.');

  await sourceClient.close();
  await targetClient.close();
}

migrateData().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
