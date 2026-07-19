/**
 * Documentation Integrity Checker
 *
 * Orchestrates all documentation checks in sequence:
 *  1. Generate fresh OpenAPI spec
 *  2. Check for stale artifacts
 *  3. Lint the OpenAPI document
 *  4. Validate route coverage
 *  5. Validate API contracts
 *
 * Exits with code 1 on first failure.
 */
import { execSync } from 'child_process';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..');

const CHECKS = [
  {
    name: '1. OpenAPI generation',
    command: 'pnpm docs:generate',
    description: 'Generating fresh OpenAPI specification...',
  },
  {
    name: '2. Stale artifact detection',
    command: 'npx tsx scripts/check-stale-openapi.ts',
    description: 'Checking for stale artifacts...',
  },
  {
    name: '3. OpenAPI linting',
    command: 'pnpm docs:lint',
    description: 'Linting OpenAPI document...',
  },
  {
    name: '4. Route coverage validation',
    command: 'npx tsx scripts/check-route-coverage.ts',
    description: 'Validating route coverage...',
  },
  {
    name: '5. API contract validation',
    command: 'npx tsx scripts/check-contract.ts',
    description: 'Validating API contracts...',
  },
];

function run() {
  console.log('═'.repeat(60));
  console.log('  Documentation Integrity Check');
  console.log('═'.repeat(60));
  console.log();

  for (const check of CHECKS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${check.name}`);
    console.log(`${check.description}`);
    console.log(`${'─'.repeat(60)}\n`);

    try {
      execSync(check.command, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
      });
    } catch {
      console.error(`\n${check.name} FAILED.`);
      console.error('Fix the issue above and re-run: pnpm docs:check');
      process.exit(1);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  ALL CHECKS PASSED');
  console.log(`${'═'.repeat(60)}`);
}

run();
