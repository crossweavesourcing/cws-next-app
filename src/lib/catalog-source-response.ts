import { createCatalogDownloadUrl, fetchCatalogPdfSource } from '@/lib/catalog-cloudinary';

const RANGE_PATTERN = /^bytes=\d*-\d*$/;

export async function catalogSourceResponse(publicId: string, request: Request): Promise<Response> {
  const secureUrl = createCatalogDownloadUrl(publicId);
  const source = new URL(secureUrl);
  if (source.protocol !== 'https:' || !['api.cloudinary.com', 'res.cloudinary.com'].includes(source.hostname)) return new Response('Catalog source is unavailable.', { status: 502 });
  const range = request.headers.get('range');
  if (range && !RANGE_PATTERN.test(range)) return new Response('Invalid range.', { status: 416 });
  const upstream = await fetchCatalogPdfSource(secureUrl, range);
  if (!upstream.ok && upstream.status !== 206) return new Response('Catalog source is unavailable.', { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
