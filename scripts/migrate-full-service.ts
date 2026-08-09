/**
 * =============================================================================
 * Full Service Migration Script
 * =============================================================================
 * Migrates ALL application assets from old Cloudinary account to a new one,
 * then copies the full MongoDB database to a new cluster, rewriting every
 * stored Cloudinary URL to point to the new account.
 *
 * USAGE:
 *   pnpm tsx --env-file=.env scripts/migrate-full-service.ts
 *
 * BEFORE RUNNING:
 *   1. Fill in the NEW_* placeholders below (or set them as env vars).
 *   2. Ensure your .env file has the OLD credentials (MONGODB_URI,
 *      CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
 *   3. Ensure NEW_MONGODB_URI is already set in .env (you have this).
 * =============================================================================
 */

import { MongoClient, type Document } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

// ─── NEW SERVICE CREDENTIALS — fill these in ──────────────────────────────────
const NEW_CLOUDINARY_CLOUD_NAME = process.env.NEW_CLOUDINARY_CLOUD_NAME || 'YOUR_NEW_CLOUD_NAME';
const NEW_CLOUDINARY_API_KEY    = process.env.NEW_CLOUDINARY_API_KEY    || 'YOUR_NEW_API_KEY';
const NEW_CLOUDINARY_API_SECRET = process.env.NEW_CLOUDINARY_API_SECRET || 'YOUR_NEW_API_SECRET';
const NEW_MONGODB_URI           = process.env.NEW_MONGODB_URI           || 'YOUR_NEW_MONGODB_URI';
const NEW_MONGODB_DB_NAME       = process.env.NEW_MONGODB_DB_NAME       || process.env.MONGODB_DB_NAME || 'cws_auth';

// ─── OLD SERVICE CREDENTIALS (from .env) ─────────────────────────────────────
const OLD_CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const OLD_CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY!;
const OLD_CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const OLD_MONGODB_URI           = process.env.MONGODB_URI!;
const OLD_MONGODB_DB_NAME       = process.env.MONGODB_DB_NAME || 'cws_auth';

// ─── Folders that belong to this application in Cloudinary ───────────────────
// Only assets under these folder prefixes will be migrated.
// This avoids migrating unrelated files from the Cloudinary account.
const APP_CLOUDINARY_FOLDERS = [
  'cws_catalog',
  'cws_catalogs',
  'cws_products',
  'cws_categories',
  'cws_sections',
  'cws_media',
];

// ─── Collections that contain Cloudinary URLs (need URL rewriting) ────────────
// Maps collectionName → array of field paths that contain Cloudinary URLs.
// Use dot notation for nested fields. Use [] suffix for array fields.
const MEDIA_COLLECTIONS: Record<string, string[]> = {
  products:          ['image', 'images[]'],
  categories:        ['image'],
  sections:          ['mediaUrl'],           // top-level mediaUrl
  catalog_documents: ['asset.secureUrl', 'asset.publicId'],
};

// URL map built during Cloudinary migration: old secure_url → new secure_url
const urlMap = new Map<string, string>();

// ─── Logging helpers ──────────────────────────────────────────────────────────
function log(msg: string)    { console.log(`  ${msg}`); }
function ok(msg: string)     { console.log(`  ✅ ${msg}`); }
function warn(msg: string)   { console.log(`  ⚠️  ${msg}`); }
function section(msg: string){ console.log(`\n${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}`); }

// ─── Validation ───────────────────────────────────────────────────────────────
function validateConfig() {
  const missing: string[] = [];
  if (!OLD_CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME (old)');
  if (!OLD_CLOUDINARY_API_KEY)    missing.push('CLOUDINARY_API_KEY (old)');
  if (!OLD_CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET (old)');
  if (!OLD_MONGODB_URI)           missing.push('MONGODB_URI (old)');
  if (NEW_CLOUDINARY_CLOUD_NAME === 'YOUR_NEW_CLOUD_NAME') missing.push('NEW_CLOUDINARY_CLOUD_NAME');
  if (NEW_CLOUDINARY_API_KEY    === 'YOUR_NEW_API_KEY')    missing.push('NEW_CLOUDINARY_API_KEY');
  if (NEW_CLOUDINARY_API_SECRET === 'YOUR_NEW_API_SECRET') missing.push('NEW_CLOUDINARY_API_SECRET');
  if (NEW_MONGODB_URI           === 'YOUR_NEW_MONGODB_URI') missing.push('NEW_MONGODB_URI');
  if (missing.length > 0) {
    console.error('\n❌ Missing required credentials:\n' + missing.map(m => `   - ${m}`).join('\n'));
    console.error('\nSet them as env vars or fill in the placeholders at the top of this script.\n');
    process.exit(1);
  }
}

// ─── Phase 1: Cloudinary Migration ───────────────────────────────────────────

/** Configure old Cloudinary SDK instance */
function getOldCloudinary() {
  const oldCloud = { ...cloudinary };
  cloudinary.config({
    cloud_name: OLD_CLOUDINARY_CLOUD_NAME,
    api_key:    OLD_CLOUDINARY_API_KEY,
    api_secret: OLD_CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/** Configure new Cloudinary SDK instance and return it */
function getNewCloudinaryConfig() {
  return {
    cloud_name: NEW_CLOUDINARY_CLOUD_NAME,
    api_key:    NEW_CLOUDINARY_API_KEY,
    api_secret: NEW_CLOUDINARY_API_SECRET,
    secure: true,
  };
}

/** List ALL resources under the application folders (handles pagination) */
async function listAppAssets(): Promise<Array<{
  public_id: string;
  secure_url: string;
  resource_type: string;
  type: string;
  format: string;
  bytes: number;
  folder?: string;
}>> {
  const allResources: any[] = [];

  for (const folder of APP_CLOUDINARY_FOLDERS) {
    let nextCursor: string | undefined;
    let page = 0;

    do {
      page++;
      log(`  Listing "${folder}" page ${page}...`);
      try {
        // Regular (public) assets
        const result = await cloudinary.api.resources({
          type: 'upload',
          resource_type: 'image',
          prefix: folder,
          max_results: 500,
          next_cursor: nextCursor,
        });
        allResources.push(...result.resources);
        nextCursor = result.next_cursor;

        // Also list authenticated assets (catalog PDFs)
        const authResult = await cloudinary.api.resources({
          type: 'authenticated',
          resource_type: 'image',
          prefix: folder,
          max_results: 500,
        });
        allResources.push(...authResult.resources);
      } catch {
        // Folder may not exist in old account — that's fine
        nextCursor = undefined;
      }
    } while (nextCursor);
  }

  // Also check raw files (videos etc)
  for (const folder of APP_CLOUDINARY_FOLDERS) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: folder,
        max_results: 500,
      });
      allResources.push(...result.resources);
    } catch { /* folder absent */ }

    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        prefix: folder,
        max_results: 500,
      });
      allResources.push(...result.resources);
    } catch { /* folder absent */ }
  }

  // Deduplicate by public_id
  const seen = new Set<string>();
  return allResources.filter(r => {
    if (seen.has(r.public_id)) return false;
    seen.add(r.public_id);
    return true;
  });
}

/** Download a file buffer from a URL */
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Upload a buffer to the NEW Cloudinary account */
async function uploadToNew(
  buffer: Buffer,
  publicId: string,
  resourceType: 'image' | 'video' | 'raw',
  uploadType: 'upload' | 'authenticated',
): Promise<string> {
  // Temporarily reconfigure cloudinary to point at new account
  cloudinary.config(getNewCloudinaryConfig());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        type: uploadType,
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        // Restore old config after upload
        cloudinary.config({
          cloud_name: OLD_CLOUDINARY_CLOUD_NAME,
          api_key:    OLD_CLOUDINARY_API_KEY,
          api_secret: OLD_CLOUDINARY_API_SECRET,
          secure: true,
        });
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload returned no result'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Build the download URL for an asset (handles authenticated type) */
function buildDownloadUrl(asset: { public_id: string; secure_url: string; type: string; resource_type: string }): string {
  if (asset.type === 'authenticated') {
    // Generate a signed private download URL valid for 5 minutes
    return cloudinary.utils.private_download_url(asset.public_id, asset.resource_type === 'image' ? 'jpg' : asset.resource_type, {
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
  }
  return asset.secure_url;
}

async function migrateCloudinaryAssets(assets: any[]) {
  let succeeded = 0;
  let failed    = 0;
  const failures: string[] = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    log(`[${i + 1}/${assets.length}] ${asset.public_id} (${asset.resource_type}/${asset.type})`);

    try {
      const downloadUrl = buildDownloadUrl(asset);
      const buffer      = await downloadBuffer(downloadUrl);
      const newUrl      = await uploadToNew(
        buffer,
        asset.public_id,
        asset.resource_type as 'image' | 'video' | 'raw',
        asset.type === 'authenticated' ? 'authenticated' : 'upload',
      );

      urlMap.set(asset.secure_url, newUrl);

      // Also map the old URL with old cloud name pattern for text-scan replacement
      const oldPattern = `res.cloudinary.com/${OLD_CLOUDINARY_CLOUD_NAME}`;
      const newPattern = `res.cloudinary.com/${NEW_CLOUDINARY_CLOUD_NAME}`;
      if (asset.secure_url.includes(oldPattern)) {
        const newSecureUrl = asset.secure_url.replace(oldPattern, newPattern);
        urlMap.set(asset.secure_url, newSecureUrl);
      }

      ok(`Uploaded → ${newUrl}`);
      succeeded++;
    } catch (err: any) {
      warn(`FAILED: ${asset.public_id} — ${err.message}`);
      failures.push(asset.public_id);
      failed++;
    }
  }

  return { succeeded, failed, failures };
}

// ─── Phase 2: MongoDB Migration ───────────────────────────────────────────────

/** Deep-walk a document and replace any string that is a known old Cloudinary URL */
function rewriteUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    // Direct map lookup
    if (urlMap.has(value)) return urlMap.get(value)!;
    // Partial URL rewrite (handles signed/transformed variants not in map)
    const oldPattern = `res.cloudinary.com/${OLD_CLOUDINARY_CLOUD_NAME}`;
    const newPattern = `res.cloudinary.com/${NEW_CLOUDINARY_CLOUD_NAME}`;
    if (value.includes(oldPattern)) return value.replace(new RegExp(oldPattern, 'g'), newPattern);
    // Also rewrite public_ids with old cloud references if any
    return value;
  }
  if (Array.isArray(value)) return value.map(rewriteUrls);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteUrls(v);
    }
    return out;
  }
  return value;
}

async function migrateDatabase(sourceClient: MongoClient, targetClient: MongoClient) {
  const sourceDb = sourceClient.db(OLD_MONGODB_DB_NAME);
  const targetDb = targetClient.db(NEW_MONGODB_DB_NAME);

  const collections = await sourceDb.listCollections().toArray();
  const appCollections = collections.filter(c => !c.name.startsWith('system.'));

  log(`Found ${appCollections.length} collections to migrate.`);

  const summaryRows: { collection: string; docs: number; urlsRewritten: number }[] = [];

  for (const colInfo of appCollections) {
    const colName = colInfo.name;
    const needsUrlRewrite = colName in MEDIA_COLLECTIONS;

    process.stdout.write(`\n  → ${colName} `);

    // Read all source documents
    const docs = await sourceDb.collection(colName).find({}).toArray();
    process.stdout.write(`(${docs.length} docs)`);

    // Drop target collection for a clean migration
    try {
      await targetDb.collection(colName).drop();
    } catch { /* collection doesn't exist yet — that's fine */ }

    let urlsRewritten = 0;

    if (docs.length > 0) {
      let migratedDocs: Document[];

      if (needsUrlRewrite) {
        // Deep-rewrite every Cloudinary URL in every document
        migratedDocs = docs.map(doc => {
          const rewritten = rewriteUrls(doc) as Document;
          // Count rewrites by comparing JSON representations
          const before = JSON.stringify(doc);
          const after  = JSON.stringify(rewritten);
          if (before !== after) urlsRewritten++;
          return rewritten;
        });
        process.stdout.write(` [URLs rewritten in ${urlsRewritten} docs]`);
      } else {
        migratedDocs = docs;
      }

      await targetDb.collection(colName).insertMany(migratedDocs);
    }

    // Recreate indexes
    let indexCount = 0;
    try {
      const indexes = await sourceDb.collection(colName).indexes();
      const nonIdIndexes = indexes.filter(idx => idx.name !== '_id_');
      if (nonIdIndexes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const specs = nonIdIndexes.map(({ v, ...rest }) => rest);
        await targetDb.collection(colName).createIndexes(specs as any);
        indexCount = nonIdIndexes.length;
      }
    } catch (err: any) {
      warn(`Index warning on ${colName}: ${err.message}`);
    }

    process.stdout.write(` ✅ (${indexCount} indexes)\n`);
    summaryRows.push({ collection: colName, docs: docs.length, urlsRewritten });
  }

  return summaryRows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Full Service Migration');
  console.log('   MongoDB + Cloudinary → New Accounts\n');

  // 1. Validate config
  validateConfig();

  // 2. Set up old Cloudinary
  getOldCloudinary();

  // ─── Phase 1: Cloudinary ──────────────────────────────────────────────────
  section('PHASE 1: Cloudinary Asset Migration');

  log(`Old account: ${OLD_CLOUDINARY_CLOUD_NAME}`);
  log(`New account: ${NEW_CLOUDINARY_CLOUD_NAME}`);
  log(`App folders: ${APP_CLOUDINARY_FOLDERS.join(', ')}\n`);

  log('Discovering application assets...');
  const assets = await listAppAssets();
  log(`Found ${assets.length} assets to migrate.\n`);

  let cloudinaryResult = { succeeded: 0, failed: 0, failures: [] as string[] };
  if (assets.length > 0) {
    cloudinaryResult = await migrateCloudinaryAssets(assets);
  } else {
    warn('No assets found in the specified app folders. Skipping Cloudinary migration.');
    warn(`If your images are in different folders, add them to APP_CLOUDINARY_FOLDERS at the top of this script.`);
  }

  log('\nCloudinary migration complete:');
  log(`  ✅ Succeeded: ${cloudinaryResult.succeeded}`);
  if (cloudinaryResult.failed > 0) {
    log(`  ❌ Failed:    ${cloudinaryResult.failed}`);
    log(`  Failed IDs:  ${cloudinaryResult.failures.join(', ')}`);
  }
  log(`  URL map entries: ${urlMap.size}`);

  // ─── Phase 2: MongoDB ─────────────────────────────────────────────────────
  section('PHASE 2: MongoDB Migration');

  log(`Old DB: ${OLD_MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')} → ${OLD_MONGODB_DB_NAME}`);
  log(`New DB: ${NEW_MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')} → ${NEW_MONGODB_DB_NAME}\n`);

  const sourceClient = await MongoClient.connect(OLD_MONGODB_URI);
  const targetClient = await MongoClient.connect(NEW_MONGODB_URI);

  let summaryRows: { collection: string; docs: number; urlsRewritten: number }[] = [];
  try {
    summaryRows = await migrateDatabase(sourceClient, targetClient);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }

  // ─── Final Summary ────────────────────────────────────────────────────────
  section('MIGRATION COMPLETE — Summary');

  console.log('\n  Cloudinary:');
  console.log(`    Assets migrated : ${cloudinaryResult.succeeded} / ${assets.length}`);
  console.log(`    Failures        : ${cloudinaryResult.failed}`);

  console.log('\n  MongoDB collections:');
  const pad = (s: string, n: number) => s.padEnd(n, ' ');
  console.log(`  ${pad('Collection', 30)} ${pad('Docs', 8)} ${pad('URLs rewritten', 16)}`);
  console.log(`  ${'-'.repeat(56)}`);
  for (const row of summaryRows) {
    console.log(`  ${pad(row.collection, 30)} ${pad(String(row.docs), 8)} ${pad(String(row.urlsRewritten), 16)}`);
  }

  console.log('\n  Next Steps:');
  console.log('  1. Update .env — replace the following values:');
  console.log(`     MONGODB_URI           = ${NEW_MONGODB_URI}`);
  console.log(`     MONGODB_DB_NAME       = ${NEW_MONGODB_DB_NAME}`);
  console.log(`     CLOUDINARY_CLOUD_NAME = ${NEW_CLOUDINARY_CLOUD_NAME}`);
  console.log(`     CLOUDINARY_API_KEY    = ${NEW_CLOUDINARY_API_KEY}`);
  console.log(`     CLOUDINARY_API_SECRET = (your new secret)`);
  console.log('  2. Remove NEW_MONGODB_URI from .env');
  console.log('  3. Run `pnpm dev` and verify the app loads correctly.\n');

  if (cloudinaryResult.failed > 0) {
    console.log('  ⚠️  Some Cloudinary assets failed. Re-run the script or upload them manually.');
    console.log('     Failed public_ids:');
    cloudinaryResult.failures.forEach(id => console.log(`     - ${id}`));
  }
}

main().catch(err => {
  console.error('\n❌ Migration failed with error:', err);
  process.exit(1);
});
