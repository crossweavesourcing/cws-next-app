import { migrateSections } from '@/database/migrations/sections';
import { getMongoClient } from '@/database/client';

async function main() {
  const dryRun = !process.argv.includes('--apply');
  try {
    const report = await migrateSections({ dryRun });
    console.log(JSON.stringify(report, null, 2));
    if (dryRun) console.log('Dry run only. Re-run with --apply to perform the migration.');
  } finally {
    const client = await getMongoClient();
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Section migration failed.');
  process.exit(1);
});
