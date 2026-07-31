import { z } from 'zod';
import type { CatalogDocument, CatalogPage, SerializedCatalogDocument } from '@/types/catalog';

export const catalogMetadataSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(''),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
  productId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
}).refine((value) => value.categoryId || value.productId, { message: 'Choose a category, a product, or both.' });

export function getPdfLimits() {
  const maxUploadMb = Number(process.env.PDF_MAX_UPLOAD_MB ?? 25);
  const maxPages = Number(process.env.PDF_MAX_PAGES ?? 100);
  const dpi = Number(process.env.PDF_RENDER_DPI ?? 200);
  if (!Number.isFinite(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 100) throw new Error('Invalid PDF_MAX_UPLOAD_MB configuration.');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) throw new Error('Invalid PDF_MAX_PAGES configuration.');
  if (!Number.isInteger(dpi) || dpi < 72 || dpi > 300) throw new Error('Invalid PDF_RENDER_DPI configuration.');
  return { maxBytes: maxUploadMb * 1024 * 1024, maxUploadMb, maxPages, dpi };
}

export function slugifyCatalog(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'catalog';
}

export function generateCatalogMarkdown(pages: CatalogPage[]): string {
  return [...pages].sort((a, b) => a.pageNumber - b.pageNumber).map((page) => `![Catalog page ${page.pageNumber}](${page.secureUrl})`).join('\n\n');
}

export function validateCatalogPages(pages: CatalogPage[], expectedCount: number): void {
  if (pages.length !== expectedCount || pages.some((page, index) => page.pageNumber !== index + 1 || page.width < 1 || page.height < 1)) {
    throw new Error('Catalog pages are incomplete or out of order.');
  }
  if (pages.some((page) => !isAllowedCloudinaryUrl(page.secureUrl))) throw new Error('Catalog contains an invalid page URL.');
}

export function isAllowedCloudinaryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch { return false; }
}

export function serializeCatalog(document: CatalogDocument): SerializedCatalogDocument {
  return {
    ...document,
    _id: document._id.toString(), categoryId: document.categoryId?.toString() ?? null, productId: document.productId?.toString() ?? null,
    createdBy: document.createdBy.toString(), updatedBy: document.updatedBy.toString(), createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(), publishedAt: document.publishedAt?.toISOString() ?? null,
  };
}
