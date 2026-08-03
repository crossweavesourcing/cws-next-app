import { describe, it, expect, vi, beforeEach } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';
import { getEnv } from '../auth/config/env';
import { ProductRepository } from '../auth/repositories/product.repository';
import { CatalogDocumentRepository } from '../auth/repositories/catalog-document.repository';
import { CategoryRepository } from '../auth/repositories/category.repository';

// Mock the environment
vi.mock('../auth/config/env', () => ({
  getEnv: vi.fn(),
}));

// Mock repositories
vi.mock('../auth/repositories/product.repository', () => ({
  ProductRepository: vi.fn(),
}));

vi.mock('../auth/repositories/catalog-document.repository', () => ({
  CatalogDocumentRepository: vi.fn(),
}));

vi.mock('../auth/repositories/category.repository', () => ({
  CategoryRepository: vi.fn(),
}));

describe('SEO Metadata - robots.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({ APP_URL: 'https://example.com' } as ReturnType<typeof getEnv>);
  });

  it('generates the correct robots.txt rules and sitemap URL', () => {
    const result = robots();
    
    expect(result.sitemap).toBe('https://example.com/sitemap.xml');
    
    // Ensure exclusions are present
    expect(result.rules).toBeDefined();
    if (Array.isArray(result.rules)) {
      expect(result.rules[0]?.disallow).toContain('/dashboard/');
      expect(result.rules[0]?.disallow).toContain('/api/');
      expect(result.rules[0]?.disallow).toContain('/*?*');
      expect(result.rules[0]?.disallow).toContain('/catalogs/*/source');
    } else {
      expect(result.rules?.disallow).toContain('/dashboard/');
      expect(result.rules?.disallow).toContain('/api/');
      expect(result.rules?.disallow).toContain('/*?*');
      expect(result.rules?.disallow).toContain('/catalogs/*/source');
    }
  });
});

describe('SEO Metadata - sitemap.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({ APP_URL: 'https://example.com' } as ReturnType<typeof getEnv>);
  });

  it('generates valid sitemap entries excluding unpublished records', async () => {
    const mockProducts = [
      { slug: 'published-product', visible: true, updatedAt: new Date('2026-01-01') },
      { slug: 'hidden-product', visible: false, updatedAt: new Date('2026-01-02') },
    ];
    
    const mockCatalogs = [
      { slug: 'published-catalog', status: 'published', updatedAt: new Date('2026-01-03') },
    ];

    ProductRepository.prototype.findAll = vi.fn().mockResolvedValue(mockProducts);
    CatalogDocumentRepository.prototype.findAll = vi.fn().mockResolvedValue(mockCatalogs);
    CategoryRepository.prototype.findAll = vi.fn().mockResolvedValue([]);

    const result = await sitemap();

    // Verify static routes
    const urls = result.map(entry => entry.url);
    expect(urls).toContain('https://example.com');
    expect(urls).toContain('https://example.com/products');

    // Verify dynamic routes include only published ones
    expect(urls).toContain('https://example.com/products/published-product');
    expect(urls).toContain('https://example.com/catalogs/published-catalog');
    
    // Verify exclusions of unpublished items
    expect(urls).not.toContain('https://example.com/products/hidden-product');
  });
});
