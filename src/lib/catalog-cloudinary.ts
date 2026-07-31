import crypto from 'crypto';
import { cloudinary } from '@/lib/cloudinary';
import { getPdfLimits } from '@/lib/catalog-documents';
import type { CatalogPage } from '@/types/catalog';
import { CatalogOperationError } from '@/lib/catalog-errors';
import { parseCatalogPdf } from '@/lib/catalog-pdf-parser';

type CloudinaryPdfResource = { public_id: string; resource_type: string; format: string; secure_url: string; bytes: number; pages?: number; version: number; original_filename?: string; context?: { custom?: Record<string, string> } };

export function createCatalogUploadSignature(actorId: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `cws_catalogs/${actorId}/${crypto.randomUUID()}`;
  const context = `catalog_owner=${actorId}`;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) throw new CatalogOperationError('STORAGE_NOT_CONFIGURED', 'Catalog storage is not configured.');
  let signature: string;
  try {
    signature = cloudinary.utils.api_sign_request({ context, public_id: publicId, timestamp, type: 'authenticated' }, apiSecret);
  } catch (error) {
    throw new CatalogOperationError('UPLOAD_SIGNING_FAILED', 'The catalog upload could not be authorized.', { cause: error });
  }
  return { apiKey, cloudName, timestamp, publicId, context, signature, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, maxBytes: getPdfLimits().maxBytes };
}

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('A catalog page could not be rendered.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export async function inspectAndRenderCatalogPdf(publicId: string, actorId: string) {
  if (!publicId.startsWith(`cws_catalogs/${actorId}/`)) throw new CatalogOperationError('UPLOAD_REJECTED', 'The uploaded catalog could not be verified.');
  const limits = getPdfLimits();
  let resource: CloudinaryPdfResource;
  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      context: true,
      pages: true,
    }) as CloudinaryPdfResource;
  } catch (error) {
    throw new CatalogOperationError('UPLOAD_REJECTED', 'The uploaded PDF could not be found in catalog storage.', { cause: error });
  }
  const pageCount = resource.pages ?? 0;
  console.info(JSON.stringify({
    level: 'info',
    event: 'catalog.pdf.metadata',
    resourceType: resource.resource_type,
    format: resource.format,
    bytes: resource.bytes,
    pageCount,
    hasOwnerContext: Boolean(resource.context?.custom?.catalog_owner),
  }));
  if (resource.resource_type !== 'image' || resource.format !== 'pdf' || resource.bytes < 1 || resource.bytes > limits.maxBytes || pageCount < 1 || pageCount > limits.maxPages) throw new CatalogOperationError('PDF_INVALID', 'The PDF is invalid or exceeds the configured limits.');
  if (resource.context?.custom?.catalog_owner !== actorId) throw new CatalogOperationError('UPLOAD_REJECTED', 'The uploaded catalog ownership could not be verified.');
  const originalUrl = cloudinary.url(publicId, {
    resource_type: 'image', type: 'authenticated', secure: true, sign_url: true,
    version: resource.version, format: 'pdf',
  });
  const downloadUrl = createCatalogDownloadUrl(publicId);
  const sourceResponse = await fetch(downloadUrl, { cache: 'no-store' });
  if (!sourceResponse.ok) {
    console.warn(JSON.stringify({ level: 'warn', event: 'catalog.pdf.source_download.failed', status: sourceResponse.status }));
    throw new CatalogOperationError('UPLOAD_REJECTED', 'The uploaded PDF source could not be retrieved.');
  }
  const source = new Uint8Array(await sourceResponse.arrayBuffer());
  const parsed = await parseCatalogPdf(source);
  const pages: CatalogPage[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const secureUrl = cloudinary.url(publicId, { resource_type: 'image', type: 'authenticated', secure: true, sign_url: true, version: resource.version, page: pageNumber, density: limits.dpi, format: 'png', flags: 'rasterize' });
    const response = await fetch(secureUrl, { cache: 'no-store' });
    if (!response.ok) throw new CatalogOperationError('PDF_RENDERING_UNAVAILABLE', 'PDF page rendering is unavailable. Check the catalog storage PDF settings.');
    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = pngDimensions(buffer);
    pages.push({ pageNumber, secureUrl, ...dimensions, bytes: buffer.length });
  }
  return { asset: { publicId, resourceType: 'image' as const, format: 'pdf' as const, secureUrl: originalUrl, originalFilename: resource.original_filename ?? 'catalog.pdf', bytes: resource.bytes, pages: pageCount, version: resource.version }, pages, ...parsed };
}

export async function fetchCatalogPdfSource(secureUrl: string, range: string | null): Promise<Response> {
  const headers = new Headers();
  if (range) headers.set('Range', range);
  return fetch(secureUrl, { headers, cache: 'no-store' });
}

export function createCatalogDownloadUrl(publicId: string): string {
  if (!publicId.startsWith('cws_catalogs/')) throw new CatalogOperationError('UPLOAD_REJECTED', 'The stored PDF source is invalid.');
  return cloudinary.utils.private_download_url(publicId, 'pdf', { type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 300 });
}

export async function parseStoredCatalogPdf(publicId: string) {
  const secureUrl = createCatalogDownloadUrl(publicId);
  const downloadUrl = new URL(secureUrl);
  if (downloadUrl.protocol !== 'https:' || !['api.cloudinary.com', 'res.cloudinary.com'].includes(downloadUrl.hostname)) throw new CatalogOperationError('UPLOAD_REJECTED', 'The stored PDF source is invalid.');
  const response = await fetch(secureUrl, { cache: 'no-store' });
  if (!response.ok) throw new CatalogOperationError('UPLOAD_REJECTED', 'The stored PDF source could not be retrieved.');
  return parseCatalogPdf(new Uint8Array(await response.arrayBuffer()));
}

export async function deleteCatalogAsset(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'authenticated', invalidate: true });
}
