import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { assembleOpenApiDocument } from '../src/lib/api/assemble';

const OUTPUT_DIR = resolve(import.meta.dirname ?? __dirname, '..', '.openapi');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'openapi.json');

async function main() {
  console.log('Generating OpenAPI specification...');

  const document = assembleOpenApiDocument();
  const json = JSON.stringify(document, null, 2);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, json, 'utf-8');

  const pathCount = Object.keys(document.paths ?? {}).length;
  let operationCount = 0;
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
      if (method in pathItem) operationCount++;
    }
  }

  console.log(`OpenAPI spec written to ${OUTPUT_FILE}`);
  console.log(`  Paths: ${pathCount}`);
  console.log(`  Operations: ${operationCount}`);
  console.log(`  Version: ${document.info.version}`);
}

main().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
