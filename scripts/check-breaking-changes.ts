/**
 * OpenAPI Breaking Change Detector
 *
 * Compares the current OpenAPI document against the base branch version
 * to detect breaking changes that would affect API consumers.
 *
 * Detected breaking changes:
 *  - Removed operations
 *  - Removed response fields
 *  - Newly required request properties
 *  - Narrowed enum values
 *  - Parameter type changes
 *  - Authentication changes (security requirement added)
 *  - Removed status codes
 *  - Incompatible response schema changes
 *
 * Exit code 1 if breaking changes are found.
 * Exit code 0 if no breaking changes or base not available.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..');
const OPENAPI_FILE = resolve(PROJECT_ROOT, '.openapi', 'openapi.json');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'ci-reports');

interface BreakingChange {
  severity: 'breaking' | 'warning';
  category: string;
  message: string;
}

function getBaseBranch(): string | null {
  // CI: use the PR base branch
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) return `origin/${baseRef}`;

  // Local: try to detect from git
  try {
    const defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    }).trim();
    return defaultBranch.replace('refs/remotes/', '');
  } catch {
    // No remote, try main
    try {
      execSync('git rev-parse --verify origin/main', { cwd: ROOT, stdio: 'pipe' });
      return 'origin/main';
    } catch {
      try {
        execSync('git rev-parse --verify origin/master', { cwd: ROOT, stdio: 'pipe' });
        return 'origin/master';
      } catch {
        return null;
      }
    }
  }
}

const ROOT = PROJECT_ROOT;

function getBaseOpenApi(baseRef: string): Record<string, unknown> | null {
  try {
    const content = execSync(`git show ${baseRef}:.openapi/openapi.json`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    });
    return JSON.parse(content);
  } catch {
    // File doesn't exist in base branch
    return null;
  }
}

function detectBreakingChanges(
  base: Record<string, unknown>,
  current: Record<string, unknown>,
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  const basePaths = (base.paths ?? {}) as Record<string, Record<string, unknown>>;
  const currentPaths = (current.paths ?? {}) as Record<string, Record<string, unknown>>;

  const methods = ['get', 'post', 'put', 'patch', 'delete'];

  // ── 1. Removed operations ──
  for (const [path, basePathItem] of Object.entries(basePaths)) {
    for (const method of methods) {
      if (!(method in basePathItem)) continue;
      const currentPathItem = currentPaths[path];
      if (!currentPathItem || !(method in currentPathItem)) {
        changes.push({
          severity: 'breaking',
          category: 'removed-operation',
          message: `Operation ${method.toUpperCase()} ${path} has been removed`,
        });
      }
    }
  }

  // ── 2. Removed status codes ──
  for (const [path, basePathItem] of Object.entries(basePaths)) {
    for (const method of methods) {
      const baseOp = basePathItem[method] as Record<string, unknown> | undefined;
      const currentPathItem = currentPaths[path];
      const currentOp = currentPathItem
        ? (currentPathItem[method] as Record<string, unknown> | undefined)
        : undefined;
      if (!baseOp || !currentOp) continue;

      const baseResponses = Object.keys(
        (baseOp.responses ?? {}) as Record<string, unknown>,
      );
      const currentResponses = Object.keys(
        (currentOp.responses ?? {}) as Record<string, unknown>,
      );

      for (const code of baseResponses) {
        if (!currentResponses.includes(code)) {
          changes.push({
            severity: 'breaking',
            category: 'removed-status-code',
            message: `Operation ${method.toUpperCase()} ${path} removed status code ${code}`,
          });
        }
      }
    }
  }

  // ── 3. Authentication changes (new security requirement added) ──
  for (const [path, basePathItem] of Object.entries(basePaths)) {
    for (const method of methods) {
      const baseOp = basePathItem[method] as Record<string, unknown> | undefined;
      const currentPathItem = currentPaths[path];
      const currentOp = currentPathItem
        ? (currentPathItem[method] as Record<string, unknown> | undefined)
        : undefined;
      if (!baseOp || !currentOp) continue;

      const baseSecurity = (baseOp.security ?? []) as Array<Record<string, unknown>>;
      const currentSecurity = (currentOp.security ?? []) as Array<Record<string, unknown>>;

      const baseHadAuth = baseSecurity.length > 0;
      const currentHasAuth = currentSecurity.length > 0;

      if (!baseHadAuth && currentHasAuth) {
        changes.push({
          severity: 'breaking',
          category: 'authentication-change',
          message: `Operation ${method.toUpperCase()} ${path} now requires authentication (was public)`,
        });
      }

      // Check if security schemes changed
      if (baseHadAuth && currentHasAuth) {
        const baseSchemes = baseSecurity.flatMap((s) => Object.keys(s)).sort();
        const currentSchemes = currentSecurity.flatMap((s) => Object.keys(s)).sort();
        if (JSON.stringify(baseSchemes) !== JSON.stringify(currentSchemes)) {
          changes.push({
            severity: 'warning',
            category: 'authentication-change',
            message: `Operation ${method.toUpperCase()} ${path} security requirements changed: [${baseSchemes.join(', ')}] → [${currentSchemes.join(', ')}]`,
          });
        }
      }
    }
  }

  // ── 4. Response field removal / type changes ──
  for (const [path, basePathItem] of Object.entries(basePaths)) {
    for (const method of methods) {
      const baseOp = basePathItem[method] as Record<string, unknown> | undefined;
      const currentPathItem = currentPaths[path];
      const currentOp = currentPathItem
        ? (currentPathItem[method] as Record<string, unknown> | undefined)
        : undefined;
      if (!baseOp || !currentOp) continue;

      const baseResponses = (baseOp.responses ?? {}) as Record<string, Record<string, unknown>>;
      const currentResponses = (currentOp.responses ?? {}) as Record<string, Record<string, unknown>>;

      for (const [code, baseResp] of Object.entries(baseResponses)) {
        const currentResp = currentResponses[code];
        if (!currentResp) continue;

        // Compare response schema properties
        const baseSchema = extractResponseSchema(baseResp);
        const currentSchema = extractResponseSchema(currentResp);

        if (baseSchema && currentSchema) {
          const baseProps = Object.keys(baseSchema.properties ?? {});
          const currentProps = Object.keys(currentSchema.properties ?? {});
          const baseRequired = (baseSchema.required ?? []) as string[];

          for (const prop of baseProps) {
            if (!currentProps.includes(prop)) {
              changes.push({
                severity: 'breaking',
                category: 'removed-field',
                message: `${method.toUpperCase()} ${path} response ${code} removed field "${prop}"`,
              });
            }
          }

          // Check for newly required fields
          const currentRequired = (currentSchema.required ?? []) as string[];
          for (const prop of currentRequired) {
            if (!baseRequired.includes(prop) && baseProps.includes(prop)) {
              changes.push({
                severity: 'breaking',
                category: 'newly-required',
                message: `${method.toUpperCase()} ${path} response ${code} field "${prop}" is now required`,
              });
            }
          }

          // Check enum narrowing
          for (const prop of baseProps) {
            if (!currentProps.includes(prop)) continue;
            const baseEnum = (baseSchema.properties as Record<string, Record<string, unknown>>)?.[prop]?.enum as unknown[] | undefined;
            const currentEnum = (currentSchema.properties as Record<string, Record<string, unknown>>)?.[prop]?.enum as unknown[] | undefined;
            if (baseEnum && currentEnum) {
              const removedValues = baseEnum.filter((v) => !currentEnum.includes(v));
              if (removedValues.length > 0) {
                changes.push({
                  severity: 'breaking',
                  category: 'narrowed-values',
                  message: `${method.toUpperCase()} ${path} response ${code}.${prop} removed enum values: ${removedValues.join(', ')}`,
                });
              }
            }
          }
        }
      }

      // ── 5. Request body: newly required fields ──
      const baseReqBody = (baseOp.requestBody ?? {}) as Record<string, unknown>;
      const currentReqBody = (currentOp.requestBody ?? {}) as Record<string, unknown>;

      const baseReqSchema = extractRequestSchema(baseReqBody);
      const currentReqSchema = extractRequestSchema(currentReqBody);

      if (baseReqSchema && currentReqSchema) {
        const baseProps = Object.keys(baseReqSchema.properties ?? {});
        const currentProps = Object.keys(currentReqSchema.properties ?? {});
        const currentRequired = (currentReqSchema.required ?? []) as string[];

        for (const prop of baseProps) {
          if (!currentProps.includes(prop)) {
            changes.push({
              severity: 'breaking',
              category: 'removed-field',
              message: `${method.toUpperCase()} ${path} request body removed field "${prop}"`,
            });
          }
        }

        const baseRequired = (baseReqSchema.required ?? []) as string[];
        for (const prop of currentProps) {
          if (!baseProps.includes(prop) && currentRequired.includes(prop)) {
            // New field that is required = breaking for existing clients
            changes.push({
              severity: 'breaking',
              category: 'newly-required',
              message: `${method.toUpperCase()} ${path} request body added required field "${prop}"`,
            });
          }
          if (baseProps.includes(prop) && currentRequired.includes(prop) && !baseRequired.includes(prop)) {
            changes.push({
              severity: 'breaking',
              category: 'newly-required',
              message: `${method.toUpperCase()} ${path} request body field "${prop}" is now required`,
            });
          }
        }
      }

      // ── 6. Parameter type changes ──
      const baseParams = (baseOp.parameters ?? []) as Array<Record<string, unknown>>;
      const currentParams = (currentOp.parameters ?? []) as Array<Record<string, unknown>>;

      const baseParamMap = new Map(baseParams.map((p) => [`${p.in}:${p.name}`, p]));
      const currentParamMap = new Map(currentParams.map((p) => [`${p.in}:${p.name}`, p]));

      for (const [key, baseParam] of baseParamMap) {
        const currentParam = currentParamMap.get(key);
        if (!currentParam) {
          changes.push({
            severity: 'breaking',
            category: 'removed-parameter',
            message: `${method.toUpperCase()} ${path} removed parameter "${baseParam.name}" (${baseParam.in})`,
          });
          continue;
        }

        const baseType = (baseParam.schema as Record<string, unknown>)?.type;
        const currentType = (currentParam.schema as Record<string, unknown>)?.type;
        if (baseType && currentType && baseType !== currentType) {
          changes.push({
            severity: 'breaking',
            category: 'parameter-type-change',
            message: `${method.toUpperCase()} ${path} parameter "${baseParam.name}" type changed: ${baseType} → ${currentType}`,
          });
        }
      }
    }
  }

  return changes;
}

function extractResponseSchema(
  response: Record<string, unknown>,
): Record<string, unknown> | null {
  const content = response.content as Record<string, Record<string, unknown>> | undefined;
  if (!content) return null;
  const json = content['application/json'];
  if (!json?.schema) return null;
  return json.schema as Record<string, unknown>;
}

function extractRequestSchema(
  requestBody: Record<string, unknown>,
): Record<string, unknown> | null {
  const content = requestBody.content as Record<string, Record<string, unknown>> | undefined;
  if (!content) return null;
  const json = content['application/json'];
  if (!json?.schema) return null;
  return json.schema as Record<string, unknown>;
}

async function main() {
  const baseRef = getBaseBranch();

  if (!baseRef) {
    console.log('No base branch detected. Skipping breaking change detection.');
    console.log('To run locally, ensure you have a remote with an origin/main or origin/master branch.');
    return;
  }

  console.log(`Comparing against base branch: ${baseRef}`);

  const baseDoc = getBaseOpenApi(baseRef);
  if (!baseDoc) {
    console.log('No OpenAPI document found in base branch. Skipping breaking change detection.');
    return;
  }

  // Load current document
  const currentDoc = JSON.parse(readFileSync(OPENAPI_FILE, 'utf-8'));

  const changes = detectBreakingChanges(baseDoc, currentDoc);

  // Write report
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = resolve(OUTPUT_DIR, 'breaking-changes.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        baseRef,
        timestamp: new Date().toISOString(),
        breakingChanges: changes.filter((c) => c.severity === 'breaking'),
        warnings: changes.filter((c) => c.severity === 'warning'),
      },
      null,
      2,
    ),
  );

  const breaking = changes.filter((c) => c.severity === 'breaking');
  const warnings = changes.filter((c) => c.severity === 'warning');

  if (breaking.length > 0) {
    console.error(`\n${breaking.length} BREAKING change(s) detected:\n`);
    for (const c of breaking) {
      console.error(`  [${c.category}] ${c.message}`);
    }
    console.error(
      '\nThese changes will break existing API consumers.',
    );
    console.error(
      'If intentional, document the breaking change and get approval before merging.',
    );
    console.error(`\nReport saved to ${reportPath}`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):\n`);
    for (const c of warnings) {
      console.log(`  [${c.category}] ${c.message}`);
    }
  }

  console.log('\nNo breaking changes detected.');
  console.log(`Report saved to ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal error in breaking change detection:', err);
  process.exit(1);
});
