/**
 * API Contract Checker
 *
 * Validates that the generated OpenAPI document conforms to API contract
 * requirements. Every operation must have responses, operationId, tags,
 * and proper structure.
 *
 * Exit code 1 on any failure.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, '..');
const OPENAPI_FILE = resolve(PROJECT_ROOT, '.openapi', 'openapi.json');

interface ContractError {
  type: string;
  message: string;
}

function main() {
  const errors: ContractError[] = [];

  // ── Load OpenAPI document ──
  let doc: Record<string, unknown>;
  try {
    const raw = readFileSync(OPENAPI_FILE, 'utf-8');
    doc = JSON.parse(raw);
  } catch {
    console.error(`Failed to read OpenAPI file at ${OPENAPI_FILE}`);
    console.error('Run "pnpm docs:generate" first.');
    process.exit(1);
  }

  const openapiVersion = doc.openapi as string;
  if (openapiVersion !== '3.1.0') {
    errors.push({
      type: 'INVALID_OPENAPI_VERSION',
      message: `Expected OpenAPI 3.1.0, got "${openapiVersion}"`,
    });
  }

  const info = doc.info as Record<string, unknown> | undefined;
  if (!info?.title) {
    errors.push({ type: 'MISSING_INFO', message: 'Document is missing info.title' });
  }
  if (!info?.version) {
    errors.push({ type: 'MISSING_INFO', message: 'Document is missing info.version' });
  }

  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  const allOperationIds: Array<{ id: string; method: string; path: string }> = [];
  let totalOperations = 0;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (!operation) continue;

      totalOperations++;
      const opLabel = `${method.toUpperCase()} ${path}`;

      // Must have operationId
      const opId = operation.operationId;
      if (!opId || typeof opId !== 'string' || opId.trim().length === 0) {
        errors.push({
          type: 'MISSING_OPERATION_ID',
          message: `${opLabel} is missing operationId`,
        });
      } else {
        allOperationIds.push({ id: opId, method: method.toUpperCase(), path });
      }

      // Must have responses
      const responses = operation.responses as Record<string, unknown> | undefined;
      if (!responses || Object.keys(responses).length === 0) {
        errors.push({
          type: 'MISSING_RESPONSES',
          message: `${opLabel} has no responses defined`,
        });
      } else {
        // Each response should have a description
        for (const [code, resp] of Object.entries(responses)) {
          const respObj = resp as Record<string, unknown>;
          if (!respObj.description) {
            errors.push({
              type: 'MISSING_RESPONSE_DESCRIPTION',
              message: `${opLabel} response ${code} has no description`,
            });
          }
        }
      }

      // Must have tags
      const tags = operation.tags as string[] | undefined;
      if (!tags || tags.length === 0) {
        errors.push({
          type: 'MISSING_TAGS',
          message: `${opLabel} has no tags`,
        });
      }

      // Must have summary
      if (!operation.summary || typeof operation.summary !== 'string') {
        errors.push({
          type: 'MISSING_SUMMARY',
          message: `${opLabel} has no summary`,
        });
      }

      // Validate security scheme references
      const security = operation.security as Array<Record<string, unknown>> | undefined;
      if (security) {
        const securitySchemes = (
          (doc.components as Record<string, unknown>)?.securitySchemes ?? {}
        ) as Record<string, unknown>;
        for (const scheme of security) {
          for (const schemeName of Object.keys(scheme)) {
            if (!securitySchemes[schemeName]) {
              errors.push({
                type: 'INVALID_SECURITY_REFERENCE',
                message: `${opLabel} references unknown security scheme "${schemeName}"`,
              });
            }
          }
        }
      }

      // Validate parameter structures
      const parameters = operation.parameters as Array<Record<string, unknown>> | undefined;
      if (parameters) {
        for (const param of parameters) {
          if (!param.name || typeof param.name !== 'string') {
            errors.push({
              type: 'INVALID_PARAMETER',
              message: `${opLabel} has a parameter without a name`,
            });
          }
          if (!param.in || !['path', 'query', 'header', 'cookie'].includes(param.in as string)) {
            errors.push({
              type: 'INVALID_PARAMETER',
              message: `${opLabel} parameter "${param.name}" has invalid "in" value`,
            });
          }
          if (param.in === 'path' && param.required !== true) {
            errors.push({
              type: 'INVALID_PARAMETER',
              message: `${opLabel} path parameter "${param.name}" must be required`,
            });
          }
        }
      }
    }
  }

  // ── Check for duplicate operationIds ──
  const seenIds = new Map<string, string[]>();
  for (const op of allOperationIds) {
    if (!seenIds.has(op.id)) seenIds.set(op.id, []);
    seenIds.get(op.id)!.push(`${op.method} ${op.path}`);
  }
  for (const [id, locations] of seenIds) {
    if (locations.length > 1) {
      errors.push({
        type: 'DUPLICATE_OPERATION_ID',
        message: `Duplicate operationId "${id}" in: ${locations.join(', ')}`,
      });
    }
  }

  // ── Validate component schemas ──
  const components = (doc.components ?? {}) as Record<string, unknown>;
  const schemas = (components.schemas ?? {}) as Record<string, unknown>;
  const securitySchemes = (components.securitySchemes ?? {}) as Record<string, unknown>;

  // Every security scheme must have a type
  for (const [name, scheme] of Object.entries(securitySchemes)) {
    const s = scheme as Record<string, unknown>;
    if (!s.type) {
      errors.push({
        type: 'INVALID_SECURITY_SCHEME',
        message: `Security scheme "${name}" is missing a type`,
      });
    }
  }

  // ── Report ──
  console.log('─'.repeat(60));
  console.log(`Contract validation: ${totalOperations} operation(s), ${Object.keys(schemas).length} schema(s), ${Object.keys(securitySchemes).length} security scheme(s)`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} contract violation(s):\n`);
    for (const e of errors) {
      console.error(`  ERROR [${e.type}]: ${e.message}`);
    }
    console.error('\nContract check FAILED.');
    process.exit(1);
  }

  console.log('\nContract check PASSED. All operations conform to requirements.');
}

main();
