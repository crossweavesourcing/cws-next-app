import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { buildSeoHealthFindings, seoHealthScore } from './health';
import type { CatalogDocument, CategoryDocument, ProductDocument } from '@/types/catalog';

describe('SEO health findings', () => {
  it('classifies missing metadata, noindex warnings, and redirect chains', () => {
    const id = new ObjectId();
    const findings = buildSeoHealthFindings({
      settings: null,
      pageSeos: [],
      products: [{
        _id: id,
        categoryId: null,
        slug: 'visible-product',
        name: 'Visible Product',
        shortDescription: '',
        overview: 'Overview',
        image: '/image.jpg',
        images: [],
        manufacturing: [],
        specifications: { material: '', productionFocus: '', finishing: '', quality: '' },
        features: [],
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductDocument],
      categories: [{
        _id: id,
        name: 'Category',
        slug: 'category',
        description: '',
        image: '/cat.jpg',
        visible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CategoryDocument],
      catalogs: [{
        _id: id,
        categoryId: null,
        productId: id,
        title: 'Catalog',
        slug: 'catalog',
        description: '',
        status: 'published',
        asset: { publicId: 'p', resourceType: 'image', format: 'pdf', secureUrl: 'https://res.cloudinary.com/demo/file.pdf', originalFilename: 'file.pdf', bytes: 1, pages: 1, version: 1 },
        pages: [],
        markdown: '',
        processingError: null,
        publishedAt: new Date(),
        createdBy: id,
        updatedBy: id,
        createdAt: new Date(),
        updatedAt: new Date(),
        seoOverrides: { noindex: true },
      } as CatalogDocument],
      redirects: [
        { _id: id, source: '/a', destination: '/b', statusCode: 301, active: true, createdAt: new Date(), createdBy: null, updatedAt: new Date(), updatedBy: null },
        { _id: new ObjectId(), source: '/b', destination: '/c', statusCode: 302, active: true, createdAt: new Date(), createdBy: null, updatedAt: new Date(), updatedBy: null },
      ],
    });

    expect(findings.some((finding) => finding.severity === 'error' && finding.module === 'Redirects')).toBe(true);
    expect(findings.some((finding) => finding.module === 'Catalog SEO')).toBe(true);
    expect(seoHealthScore(findings)).toBeLessThan(100);
  });
});
