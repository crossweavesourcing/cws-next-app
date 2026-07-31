import { ObjectId } from 'mongodb';
import { getCatalogDocumentsCollection, getMongoClient } from '../src/database';
import { parseStoredCatalogPdf } from '../src/lib/catalog-cloudinary';
import { validateCatalogScene } from '../src/lib/catalog-documents';

type Options = { apply: boolean; force: boolean; catalogId: string | null };

function optionsFrom(argv: string[]): Options {
  const idFlag = argv.find((value) => value.startsWith('--catalog-id='));
  const catalogId = idFlag?.slice('--catalog-id='.length) ?? null;
  if (catalogId && !ObjectId.isValid(catalogId)) throw new Error('--catalog-id must be a valid MongoDB ObjectId.');
  return { apply: argv.includes('--apply'), force: argv.includes('--force'), catalogId };
}

async function main() {
  const options = optionsFrom(process.argv.slice(2));
  const collection = await getCatalogDocumentsCollection();
  const filter = options.catalogId ? { _id: new ObjectId(options.catalogId) } : {};
  const catalogs = await collection.find(filter).sort({ _id: 1 }).toArray();
  const report = { mode: options.apply ? 'apply' : 'dry-run', found: catalogs.length, processed: 0, skipped: 0, failed: 0 };

  for (const catalog of catalogs) {
    if (!options.force && catalog.sceneVersion === 1 && catalog.scene) {
      report.skipped += 1;
      console.info(JSON.stringify({ event: 'catalog.scene.migration.skipped', catalogId: catalog._id.toString(), reason: 'already-current' }));
      continue;
    }
    try {
      const parsed = await parseStoredCatalogPdf(catalog.asset.publicId);
      validateCatalogScene(parsed.scene, catalog.asset.pages);
      if (options.apply) await collection.updateOne({ _id: catalog._id }, { $set: { sceneVersion: parsed.scene.version, scene: parsed.scene, markdown: parsed.markdown } });
      report.processed += 1;
      console.info(JSON.stringify({ event: 'catalog.scene.migration.processed', catalogId: catalog._id.toString(), pageCount: parsed.scene.pages.length, applied: options.apply }));
    } catch (error) {
      report.failed += 1;
      console.error(JSON.stringify({ event: 'catalog.scene.migration.failed', catalogId: catalog._id.toString(), error: error instanceof Error ? error.message : 'Unknown migration error' }));
    }
  }
  console.info(JSON.stringify({ event: 'catalog.scene.migration.complete', ...report }));
  if (report.failed) process.exitCode = 1;
}

main().finally(async () => { await (await getMongoClient()).close(); });
