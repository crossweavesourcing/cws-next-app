/**
 * Route Coverage Checker
 *
 * Discovers all App Router API route files, extracts exported HTTP method
 * handlers via TypeScript AST analysis, translates filesystem paths into
 * OpenAPI paths, and compares against the generated OpenAPI document.
 *
 * Exit code 1 on any failure.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import * as ts from 'typescript';

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next') continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findRouteFiles(full));
    } else if (entry === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');
const OPENAPI_FILE = resolve(PROJECT_ROOT, '.openapi', 'openapi.json');

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

type ExclusionEntry = {
  method: string;
  path: string;
  reason: string;
  category?: string;
};

interface RouteEndpoint {
  method: string;
  apiPath: string;
  sourceFile: string;
}

interface CoverageError {
  type:
    | 'MISSING_FROM_OPENAPI'
    | 'EXTRA_IN_OPENAPI'
    | 'MISSING_OPERATION_ID'
    | 'DUPLICATE_OPERATION_ID'
    | 'PATH_PARAM_INCONSISTENT'
    | 'EXCLUSION_NO_REASON'
    | 'STALE_ARTIFACT'
    | 'MISSING_OPENAPI_FILE';
  message: string;
  details?: Record<string, string>;
}

/**
 * Convert a filesystem route path to an OpenAPI path.
 *
 * Rules:
 *  - Strip prefix up to and including `app/api/`
 *  - Remove route groups: `(groupName)` segments
 *  - Remove `route.ts` filename
 *  - Translate `[param]` → `{param}`
 *  - Translate `[...param]` → `{param}` (catch-all)
 *  - Translate `[[...param]]` → `{param}` (optional catch-all)
 *  - Ensure leading `/api/`
 */
function filesystemToApiPath(routeFilePath: string): string {
  const rel = routeFilePath.replace(SRC_DIR + '/', '');
  let segments = rel.split('/');

  // Remove the trailing route.ts
  const routeIdx = segments.lastIndexOf('route.ts');
  if (routeIdx === -1) return '';
  segments = segments.slice(0, routeIdx);

  // Remove the 'app' directory (Next.js App Router root, not a URL segment)
  if (segments[0] === 'app') segments = segments.slice(1);

  // Filter out route groups (parenthesized segments)
  segments = segments.filter((s) => !/^\(.*\)$/.test(s));

  // Translate parameter segments
  const translated = segments.map((seg) => {
    // Optional catch-all: [[...param]]
    const optionalCatchAll = seg.match(/^\[\[\.\.\.(.+)\]\]$/);
    if (optionalCatchAll) return `{${optionalCatchAll[1]}}`;

    // Required catch-all: [...param]
    const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) return `{${catchAll[1]}}`;

    // Dynamic segment: [param]
    const dynamic = seg.match(/^\[(.+)\]$/);
    if (dynamic) return `{${dynamic[1]}}`;

    return seg;
  });

  return '/' + translated.join('/');
}

/**
 * Parse a route.ts file using the TypeScript compiler API and extract
 * exported HTTP method handler function names.
 */
function extractHttpMethods(routeFilePath: string): string[] {
  const source = readFileSync(routeFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    routeFilePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  const methods: string[] = [];

  function visit(node: ts.Node) {
    // Match `export async function METHOD(...)` or `export function METHOD(...)`
    if (
      ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const name = node.name?.getText(sourceFile);
      if (name && HTTP_METHODS.includes(name as (typeof HTTP_METHODS)[number])) {
        methods.push(name);
      }
    }

    // Match `export const METHOD = async (...)` (arrow function assigned to const)
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sourceFile);
        if (HTTP_METHODS.includes(name as (typeof HTTP_METHODS)[number])) {
          // Skip non-handler exports like `runtime`
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer))
          ) {
            methods.push(name);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return methods;
}

/**
 * Load the EXCLUDED_ROUTES from assemble.ts at runtime.
 */
async function loadExclusions(): Promise<ExclusionEntry[]> {
  // Dynamic import of the assembled module
  const { EXCLUDED_ROUTES } = await import('../src/lib/api/assemble.js');
  return EXCLUDED_ROUTES as ExclusionEntry[];
}

/**
 * Load the generated OpenAPI document.
 */
function loadOpenApiDoc(): Record<string, unknown> | null {
  try {
    const raw = readFileSync(OPENAPI_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const errors: CoverageError[] = [];
  const warnings: string[] = [];

  // ── Step 1: Discover all route.ts files ──
  const routeFiles = findRouteFiles(resolve(PROJECT_ROOT, 'src', 'app', 'api'))
    .map((abs) => relative(PROJECT_ROOT, abs));

  if (routeFiles.length === 0) {
    console.error('No API route files found under src/app/api/');
    process.exit(1);
  }

  console.log(`Discovered ${routeFiles.length} API route file(s).\n`);

  // ── Step 2: Extract implemented method/path pairs ──
  const implemented: RouteEndpoint[] = [];

  for (const relPath of routeFiles) {
    const absPath = resolve(PROJECT_ROOT, relPath);
    const apiPath = filesystemToApiPath(absPath);
    const methods = extractHttpMethods(absPath);

    for (const method of methods) {
      implemented.push({ method, apiPath, sourceFile: relPath });
    }
  }

  console.log(`Extracted ${implemented.length} implemented method/path pair(s):\n`);
  for (const ep of implemented) {
    const tag = ep.method === 'OPTIONS' ? '  [cors-preflight]' : '';
    console.log(`  ${ep.method.padEnd(7)} ${ep.apiPath}${tag}`);
  }
  console.log();

  // ── Step 3: Load exclusions ──
  const exclusions = await loadExclusions();
  const exclusionKeys = new Set(exclusions.map((e) => `${e.method} ${e.path}`));

  // Validate all exclusions have reasons
  for (const excl of exclusions) {
    if (!excl.reason || excl.reason.trim().length === 0) {
      errors.push({
        type: 'EXCLUSION_NO_REASON',
        message: `Exclusion ${excl.method} ${excl.path} has no reason`,
      });
    }
  }

  // ── Step 4: Load OpenAPI document ──
  const doc = loadOpenApiDoc();

  if (!doc) {
    errors.push({
      type: 'MISSING_OPENAPI_FILE',
      message: `OpenAPI file not found at ${OPENAPI_FILE}. Run "pnpm docs:generate" first.`,
    });
    console.error(errors.map((e) => `ERROR: ${e.message}`).join('\n'));
    process.exit(1);
  }

  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  const documentedOps: Array<{ method: string; path: string; operationId?: string }> = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (operation) {
        documentedOps.push({
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId as string | undefined,
        });
      }
    }
  }

  console.log(`OpenAPI document contains ${documentedOps.length} operation(s).\n`);

  // ── Step 5: Check for undocumented methods (implemented but not in OpenAPI) ──
  const docKeySet = new Set(documentedOps.map((o) => `${o.method} ${o.path}`));

  for (const ep of implemented) {
    const key = `${ep.method} ${ep.apiPath}`;
    const isExcluded = exclusionKeys.has(key);

    if (!docKeySet.has(key) && !isExcluded) {
      errors.push({
        type: 'MISSING_FROM_OPENAPI',
        message: `Implemented route ${ep.method} ${ep.apiPath} is missing from OpenAPI document`,
        details: { file: ep.sourceFile },
      });
    }
  }

  // ── Step 6: Check for phantom operations (in OpenAPI but not implemented) ──
  const implKeySet = new Set(implemented.map((e) => `${e.method} ${e.apiPath}`));

  for (const op of documentedOps) {
    const key = `${op.method} ${op.path}`;
    if (!implKeySet.has(key)) {
      // Could be an exclusion
      if (!exclusionKeys.has(key)) {
        errors.push({
          type: 'EXTRA_IN_OPENAPI',
          message: `OpenAPI operation ${op.method} ${op.path} has no corresponding route handler`,
        });
      }
    }
  }

  // ── Step 7: Validate all documented operations have operationId ──
  for (const op of documentedOps) {
    if (!op.operationId || op.operationId.trim().length === 0) {
      errors.push({
        type: 'MISSING_OPERATION_ID',
        message: `${op.method} ${op.path} is missing an operationId`,
      });
    }
  }

  // ── Step 8: Check for duplicate operationIds ──
  const operationIds = documentedOps.filter((o) => o.operationId).map((o) => o.operationId!);
  const seenIds = new Map<string, string[]>();
  for (const id of operationIds) {
    const key = id;
    if (!seenIds.has(key)) seenIds.set(key, []);
    const op = documentedOps.find((o) => o.operationId === id)!;
    seenIds.get(key)!.push(`${op.method} ${op.path}`);
  }
  for (const [id, locations] of seenIds) {
    if (locations.length > 1) {
      errors.push({
        type: 'DUPLICATE_OPERATION_ID',
        message: `Duplicate operationId "${id}" found in: ${locations.join(', ')}`,
      });
    }
  }

  // ── Step 9: Validate path parameter consistency ──
  for (const op of documentedOps) {
    // Extract path params from OpenAPI path: {param}
    const docParams = [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

    // Find the matching implemented endpoint
    const impl = implemented.find(
      (e) => e.method === op.method && e.apiPath === op.path,
    );
    if (impl) {
      const fsPath = impl.sourceFile
        .replace(/^src\/app\/api\//, '')
        .replace(/\/route\.ts$/, '');
      const fsParams = [...fsPath.matchAll(/\[([^\]]+)\]/g)]
        .map((m) => m[1])
        .filter((p) => !p.startsWith('...') && !p.startsWith('['))
        .map((p) => p.replace(/^\[\[/, ''));

      const docSet = new Set(docParams);
      const fsSet = new Set(fsParams);

      for (const p of docSet) {
        if (!fsSet.has(p)) {
          warnings.push(
            `Path parameter {${p}} in OpenAPI for ${op.method} ${op.path} does not have a matching filesystem segment`,
          );
        }
      }
    }
  }

  // ── Step 10: Validate stale artifact ──
  // Regenerate and compare
  const { assembleOpenApiDocument } = await import('../src/lib/api/assemble.js');
  const freshDoc = assembleOpenApiDocument();
  const currentRaw = JSON.parse(
    readFileSync(OPENAPI_FILE, 'utf-8'),
  );
  // Compare paths (the key structural element)
  const currentPaths = JSON.stringify(currentRaw.paths ?? {});
  const freshPaths = JSON.stringify(freshDoc.paths ?? {});
  if (currentPaths !== freshPaths) {
    errors.push({
      type: 'STALE_ARTIFACT',
      message: 'The generated openapi.json is stale. Run "pnpm docs:generate" to update.',
    });
  }

  // ── Report ──
  console.log('─'.repeat(60));

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):\n`);
    for (const w of warnings) {
      console.log(`  WARN: ${w}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) found:\n`);
    for (const e of errors) {
      console.error(`  ERROR [${e.type}]: ${e.message}`);
      if (e.details) {
        for (const [k, v] of Object.entries(e.details)) {
          console.error(`    ${k}: ${v}`);
        }
      }
    }
    console.error(
      '\nDocumentation coverage check FAILED. All API routes must be documented.',
    );
    process.exit(1);
  }

  const excludedCount = exclusions.length;
  const documentedCount = documentedOps.length;
  const totalImplemented = implemented.length;

  console.log('\nDocumentation coverage PASSED');
  console.log(`  Implemented routes: ${totalImplemented} (${excludedCount} excluded)`);
  console.log(`  Documented operations: ${documentedCount}`);
  console.log(`  Coverage: 100% (all applicable routes are documented)`);
}

main().catch((err) => {
  console.error('Fatal error in coverage check:', err);
  process.exit(1);
});
