import { describe, it, expect } from 'vitest';
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildWebPageSchema,
  buildProductSchema,
  buildBreadcrumbSchema,
  serializeJsonLd,
} from './schema-builders';
import { ObjectId } from 'mongodb';

describe('Schema Builders', () => {
  const APP_URL = 'https://example.com';

  it('builds Organization schema without inventing missing data', () => {
    const sectionContent = {
      bangladeshAddress: '123 Fake St, BD',
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org: any = buildOrganizationSchema(APP_URL, sectionContent as any);
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe('Cross Weave Sourcing');
    expect(org.address).toBeDefined();
    expect(org.address.streetAddress).toBe('123 Fake St, BD');
    
    // Ensure missing fields aren't invented
    expect(org.telephone).toBeUndefined();
    expect(org.email).toBeUndefined();
  });

  it('builds WebSite schema without SearchAction', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const site: any = buildWebSiteSchema(APP_URL);
    expect(site['@type']).toBe('WebSite');
    expect(site.url).toBe(APP_URL);
    expect(site.potentialAction).toBeUndefined(); // No SearchAction
  });

  it('builds Product schema omitting Offer and Reviews', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockProduct: any = {
      _id: new ObjectId(),
      slug: 'test-product',
      name: 'Test Product',
      shortDescription: 'Short desc',
      overview: 'Overview',
      image: '/img.jpg',
      images: ['/img1.jpg', '/img2.jpg'],
      manufacturing: ['Step 1'],
      features: ['Feature 1'],
      visible: true,
      specifications: {
        material: '100% Cotton',
        productionFocus: 'Knit',
        finishing: 'Soft',
        quality: 'AQL 1.5'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product: any = buildProductSchema(mockProduct, 'Shirts', APP_URL);
    
    expect(product['@type']).toBe('Product');
    expect(product.name).toBe('Test Product');
    expect(product.category).toBe('Shirts');
    expect(product.material).toBe('100% Cotton');
    expect(product.image).toEqual(['https://example.com/img1.jpg', 'https://example.com/img2.jpg']);
    
    // Explicit exclusions
    expect(product.offers).toBeUndefined();
    expect(product.aggregateRating).toBeUndefined();
    expect(product.review).toBeUndefined();
    expect(product.sku).toBeUndefined();
  });

  it('builds BreadcrumbList correctly', () => {
    const items = [
      { name: 'Home', url: 'https://example.com' },
      { name: 'Products', url: 'https://example.com/products' }
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breadcrumb: any = buildBreadcrumbSchema(items);
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    expect(breadcrumb.itemListElement.length).toBe(2);
    expect(breadcrumb.itemListElement[0].position).toBe(1);
    expect(breadcrumb.itemListElement[0].item.name).toBe('Home');
  });

  it('serializes JSON-LD safely', () => {
    const badSchema = {
      name: 'Test <script>alert(1)</script>',
    };
    const htmlSafe = serializeJsonLd(badSchema);
    expect(htmlSafe).not.toContain('<script>');
    expect(htmlSafe).toContain('\\u003cscript');
  });
});
