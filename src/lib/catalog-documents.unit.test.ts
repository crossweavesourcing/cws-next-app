import { afterEach, describe, expect, it } from 'vitest';
import { catalogMetadataSchema, generateCatalogMarkdown, getPdfLimits, isAllowedCloudinaryUrl, slugifyCatalog, validateCatalogPages } from './catalog-documents';

const pages = [
  { pageNumber: 1, secureUrl: 'https://res.cloudinary.com/demo/image/authenticated/s--a--/p-1.png', width: 1200, height: 1600, bytes: 10 },
  { pageNumber: 2, secureUrl: 'https://res.cloudinary.com/demo/image/authenticated/s--b--/p-2.png', width: 1200, height: 1600, bytes: 12 },
];

describe('catalog document invariants', () => {
  const original = { maxMb: process.env.PDF_MAX_UPLOAD_MB, pages: process.env.PDF_MAX_PAGES, dpi: process.env.PDF_RENDER_DPI };
  afterEach(() => {
    if (original.maxMb === undefined) delete process.env.PDF_MAX_UPLOAD_MB; else process.env.PDF_MAX_UPLOAD_MB = original.maxMb;
    if (original.pages === undefined) delete process.env.PDF_MAX_PAGES; else process.env.PDF_MAX_PAGES = original.pages;
    if (original.dpi === undefined) delete process.env.PDF_RENDER_DPI; else process.env.PDF_RENDER_DPI = original.dpi;
  });
  it('requires at least one valid association', () => { expect(catalogMetadataSchema.safeParse({ title: 'Range', description: '', categoryId: null, productId: null }).success).toBe(false); expect(catalogMetadataSchema.safeParse({ title: 'Range', description: '', categoryId: '507f1f77bcf86cd799439011', productId: null }).success).toBe(true); });
  it('creates stable slugs and ordered image-only markdown', () => { expect(slugifyCatalog('  Summer / Range 2026 ')).toBe('summer-range-2026'); expect(generateCatalogMarkdown([...pages].reverse())).toBe('![Catalog page 1](https://res.cloudinary.com/demo/image/authenticated/s--a--/p-1.png)\n\n![Catalog page 2](https://res.cloudinary.com/demo/image/authenticated/s--b--/p-2.png)'); });
  it('rejects nonsequential pages and unexpected hosts', () => { expect(() => validateCatalogPages(pages, 2)).not.toThrow(); expect(() => validateCatalogPages([{ ...pages[0], pageNumber: 2 }], 1)).toThrow(); expect(isAllowedCloudinaryUrl('https://res.cloudinary.com/demo/page.png')).toBe(true); expect(isAllowedCloudinaryUrl('https://example.com/page.png')).toBe(false); });
  it('validates deployment limits', () => { process.env.PDF_RENDER_DPI = '301'; expect(() => getPdfLimits()).toThrow('Invalid PDF_RENDER_DPI'); });
});
