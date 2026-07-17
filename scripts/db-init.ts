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
import {
  getCollectionStats,
  sweepExpiredAuthState,
}                                 from '@/database/maintenance';
import { registerShutdownHandlers } from '@/database/shutdown';
import { getEnv }                 from '@/auth/config/env';
import { seedUsers }              from './seed-users';

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
  // ── 1. Validate config & environment ──────────────────────────────────────────────
  const config = getDatabaseConfig(); // throws DatabaseConfigError if invalid
  getEnv(); // validates auth secrets and seed credentials

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

  // ── 5. Initialize (collections + idempotent indexes) ─────────────────────────
  const report = await initializeDatabase();

  const nameWidth = Math.max(...report.collections.map(r => r.collection.length)) + 2;

  for (const r of report.collections) {
    const action = r.action === 'created'
      ? `${GREEN}created${RESET} `
      : `${CYAN}updated${RESET} `;
    const idxStr = r.indexesAdded > 0
      ? `(${r.indexesAdded} index${r.indexesAdded !== 1 ? 'es' : ''})`
      : '';
    const warn = r.indexErrors.length > 0 ? ` ${YELLOW}(index errors: ${r.indexErrors.length})${RESET}` : '';
    console.log(`  ${GREEN}✓${RESET}  ${pad(r.collection, nameWidth)} ${action}  ${YELLOW}${idxStr}${RESET}${warn}`);
  }

  if (report.hadIndexErrors) {
    console.log(`  ${YELLOW}⚠ Some indexes failed to build (non-fatal). Re-run db:init or the maintenance job to heal.${RESET}`);
  }

  // ── 6. Seed predefined users ────────────────────────────────────────────────
  const shouldSeed = process.argv.includes('--seed');
  if (shouldSeed) {
    await seedUsers();
  } else {
    console.log('  Seeding skipped. Run with --seed flag to seed default admin.');
  }

  // ── 7. Post-init cleanup sweep ──────────────────────────────────────────────
  // Removes expired/revoked refresh tokens + sessions immediately (the TTL
  // monitor only runs every ~60s). Safe + idempotent; never fails boot.
  let sweep;
  try {
    sweep = await sweepExpiredAuthState();
    console.log(
      `  ${CYAN}↻ Sweep:${RESET} deleted ` +
      `${sweep.refreshTokensExpired} expired + ${sweep.refreshTokensRevoked} revoked refresh tokens, ` +
      `${sweep.sessionsRevoked} revoked + ${sweep.sessionsExpired} expired sessions ` +
      `(${sweep.durationMs}ms)`,
    );
  } catch (err) {
    console.log(`  ${YELLOW}⚠ Sweep skipped (non-fatal): ${err instanceof Error ? err.message : String(err)}${RESET}`);
  }

  // ── 8. Post-flight health check ─────────────────────────────────────────────
  const post = await checkDatabaseHealth();

  // ── 9. Collection stats ─────────────────────────────────────────────────────
  const stats = await getCollectionStats();

  // ── 10. Summary ─────────────────────────────────────────────────────────────
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
