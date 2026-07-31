import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workerPath = resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
  const worker = await readFile(workerPath);
  return new Response(worker, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
