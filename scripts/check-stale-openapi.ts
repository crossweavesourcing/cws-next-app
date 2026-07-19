/**
 * Stale OpenAPI Artifact Checker
 *
 * Verifies that the committed public/openapi.json matches what would be
 * generated from the current source code. If they differ, the artifact
 * is stale and must be regenerated.
 *
 * Exit code 1 if stale.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..');
const OPENAPI_FILE = resolve(PROJECT_ROOT, '.openapi', 'openapi.json');

async function main() {
  // Load the committed file
  let current: Record<string, unknown>;
  try {
    const raw = readFileSync(OPENAPI_FILE, 'utf-8');
    current = JSON.parse(raw);
  } catch {
    console.error(`Cannot read ${OPENAPI_FILE}. Run "pnpm docs:generate" first.`);
    process.exit(1);
  }

  // Regenerate from source
  const { assembleOpenApiDocument } = await import('../src/lib/api/assemble.js');
  const fresh = assembleOpenApiDocument();

  // Normalize both for comparison (strip server-specific fields that vary)
  const normalize = (doc: Record<string, unknown>) => {
    const clone = JSON.parse(JSON.stringify(doc));
    // Remove server URL (varies by environment)
    if (clone.servers) {
      for (const server of clone.servers) {
        delete server.url;
      }
    }
    return JSON.stringify(clone, null, 2);
  };

  const currentNormalized = normalize(current);
  const freshNormalized = normalize(fresh as unknown as Record<string, unknown>);

  if (currentNormalized === freshNormalized) {
    console.log('OpenAPI artifact is up to date.');
    return;
  }

  // Find what changed
  const currentPaths = Object.keys(current.paths ?? {}).sort();
  const freshPaths = Object.keys(fresh.paths ?? {}).sort();

  const removed = currentPaths.filter((p) => !freshPaths.includes(p));
  const added = freshPaths.filter((p) => !currentPaths.includes(p));

  console.error('OpenAPI artifact is STALE.\n');
  if (removed.length > 0) {
    console.error(`  Removed paths: ${removed.join(', ')}`);
  }
  if (added.length > 0) {
    console.error(`  Added paths: ${added.join(', ')}`);
  }

  // Compare operation counts per path
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  for (const path of currentPaths.filter((p) => freshPaths.includes(p))) {
    const currentOps = methods.filter(
      (m) => (current.paths as Record<string, unknown>)[path] && m in ((current.paths as Record<string, unknown>)[path] as Record<string, unknown>),
    );
    const freshOps = methods.filter(
      (m) => (fresh.paths as Record<string, unknown>)[path] && m in ((fresh.paths as Record<string, unknown>)[path] as Record<string, unknown>),
    );
    const opsRemoved = currentOps.filter((m) => !freshOps.includes(m));
    const opsAdded = freshOps.filter((m) => !currentOps.includes(m));
    if (opsRemoved.length > 0) {
      console.error(`  ${path}: removed methods ${opsRemoved.join(', ')}`);
    }
    if (opsAdded.length > 0) {
      console.error(`  ${path}: added methods ${opsAdded.join(', ')}`);
    }
  }

  console.error('\nRun "pnpm docs:generate" to update the artifact.');
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error in stale check:', err);
  process.exit(1);
});
