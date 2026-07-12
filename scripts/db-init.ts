/**
 * Database Initialization CLI Entrypoint
 *
 * Run with: pnpm db:init
 * (which resolves to: tsx --env-file=.env scripts/db-init.ts)
 *
 * This file is the ONLY place with process lifecycle concerns:
 *   - process.exit(), console output, timing
 * All database logic lives in src/database/init.ts.
 */

import { getDatabaseConfig }      from '@/database/config';
import { getMongoClient }         from '@/database/client';
import { checkDatabaseHealth }    from '@/database/health';
import { initializeDatabase }     from '@/database/init';
import { getCollectionStats }     from '@/database/maintenance';
import { registerShutdownHandlers } from '@/database/shutdown';

const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';

function pad(s: string, len: number): string {
  return s.padEnd(len, ' ');
}

async function main(): Promise<void> {
  // ── 1. Validate config ──────────────────────────────────────────────────────
  const config = getDatabaseConfig(); // throws DatabaseConfigError if invalid

  // ── 2. Register shutdown handlers ───────────────────────────────────────────
  registerShutdownHandlers();

  // ── 3. Print header ─────────────────────────────────────────────────────────
  const cluster = new URL(config.uri.replace('mongodb+srv://', 'https://')).hostname;
  console.log(`
${BOLD}╔══════════════════════════════════════════════════════════════════╗
║         CWS Auth — Database Initializer                         ║
╚══════════════════════════════════════════════════════════════════╝${RESET}

  ${CYAN}Database${RESET}   : ${config.dbName}
  ${CYAN}Cluster${RESET}    : ${cluster}
  ${CYAN}Started${RESET}    : ${new Date().toISOString()}
`);

  // ── 4. Pre-flight health check ──────────────────────────────────────────────
  process.stdout.write(`  Connecting to cluster...`);
  const pre = await checkDatabaseHealth();
  if (pre.status === 'unhealthy') {
    console.log(`\n\n  ${RED}✗ Cannot reach MongoDB cluster.${RESET}`);
    console.log(`    Error: ${pre.error ?? 'unknown'}`);
    console.log(`    Verify MONGODB_URI is correct and the cluster is reachable.\n`);
    process.exit(1);
  }
  console.log(` ${GREEN}OK${RESET} (${pre.latencyMs}ms)\n`);

  // ── 5. Initialize ───────────────────────────────────────────────────────────
  const report = await initializeDatabase();

  const nameWidth = Math.max(...report.collections.map(r => r.collection.length)) + 2;

  for (const r of report.collections) {
    const action = r.action === 'created'
      ? `${GREEN}created${RESET} `
      : `${CYAN}updated${RESET} `;
    const idxStr = r.indexesAdded > 0
      ? `(${r.indexesAdded} index${r.indexesAdded !== 1 ? 'es' : ''})`
      : '';
    console.log(`  ${GREEN}✓${RESET}  ${pad(r.collection, nameWidth)} ${action}  ${YELLOW}${idxStr}${RESET}`);
  }

  // ── 6. Post-flight health check ─────────────────────────────────────────────
  const post = await checkDatabaseHealth();

  // ── 7. Collection stats ─────────────────────────────────────────────────────
  const stats = await getCollectionStats();

  // ── 8. Summary ──────────────────────────────────────────────────────────────
  console.log(`
  ${BOLD}Summary${RESET}
  ──────────────────────────────────────────────────────
  Collections   : ${GREEN}${report.totalCreated} created${RESET}  /  ${CYAN}${report.totalUpdated} updated${RESET}
  Indexes       : ${report.totalIndexes} created/verified
  Duration      : ${report.durationMs} ms

  ${BOLD}Post-init Health${RESET}
  Status        : ${post.status === 'healthy' ? GREEN : YELLOW}${post.status}${RESET}
  Ping latency  : ${post.latencyMs} ms
  Collections   : ${post.collections}

  ${BOLD}Collection Stats${RESET}
  ${'Collection'.padEnd(nameWidth)}  Docs     Size`);

  for (const s of stats) {
    const sizeKb = (s.sizeBytes / 1024).toFixed(1);
    console.log(`  ${pad(s.collection, nameWidth)}  ${String(s.documentCount).padStart(6)}   ${sizeKb} KB`);
  }

  const icon = post.status === 'healthy' ? `${GREEN}✅` : `${YELLOW}⚠️`;
  console.log(`\n  ${icon}  Database initialization complete.${RESET}\n`);
}

main().catch(err => {
  console.error(`\n  ${RED}✗ Initialization failed:${RESET}`, err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
}).finally(async () => {
  // Close the connection cleanly even if main() rejects
  try {
    const { getMongoClient: getClient } = await import('@/database/client');
    const client = await getClient();
    await client.close();
  } catch {
    // ignore close errors
  }
});
