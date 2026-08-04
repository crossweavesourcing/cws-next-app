import { describe, it, expect, vi, beforeEach } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';
import { metadata as dashboardMetadata } from './(admin)/dashboard/layout';
import { __clearEnvCacheForTests } from '@/auth/config/env';

// Mock repositories used in sitemap.ts
vi.mock('@/auth/repositories/product.repository', () => {
  return {
    ProductRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([
        { slug: 'published-product', visible: true, updatedAt: new Date('2024-01-01') },
        { slug: 'hidden-product', visible: false, updatedAt: new Date('2024-01-01') }
      ])
    }))
  };
});

vi.mock('@/auth/repositories/catalog-document.repository', () => {
  return {
    CatalogDocumentRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([
        { slug: 'catalog-1', updatedAt: new Date('2024-01-01') }
      ])
    }))
  };
});

vi.mock('@/auth/repositories/category.repository', () => {
  return {
    CategoryRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([
        { slug: 'visible-category', visible: true, updatedAt: new Date('2024-01-01') },
        { slug: 'hidden-category', visible: false, updatedAt: new Date('2024-01-01') }
      ])
    }))
  };
});

// Avoid actually testing the database logic in unit tests
vi.mock('@/auth/dal', () => ({}));

describe('SEO Crawlability and Route Protection', () => {
  beforeEach(() => {
    __clearEnvCacheForTests();
    process.env.APP_URL = 'https://crossweavesourcing.com';
    // Provide necessary env vars to pass security validation in case env.ts parses them
    process.env.SESSION_SECRET = 'a_very_long_secret_that_is_32_chars_min';
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.ARGON2_SECRET = '1234567890123456';
    process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.ADMIN_SEED_PASSWORD = 'SeedPassword123!';
  });

  describe('robots.txt', () => {
    it('should generate valid robots rules', () => {
      const result = robots();
      expect(result.rules).toBeDefined();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rules: any = result.rules;
      expect(rules.allow).toContain('/');
      expect(rules.disallow).toContain('/dashboard/');
      expect(rules.disallow).toContain('/api/');
      expect(result.sitemap).toBe('https://crossweavesourcing.com/sitemap.xml');
    });
  });

  describe('sitemap.xml', () => {
    it('should include static pages, visible products, and published catalogs', async () => {
      const result = await sitemap();
      
      const urls = result.map(entry => entry.url);
      
      // Static pages
      expect(urls).toContain('https://crossweavesourcing.com');
      expect(urls).toContain('https://crossweavesourcing.com/legal/privacy');
      expect(urls).toContain('https://crossweavesourcing.com/products');

      // Dynamic content
      expect(urls).toContain('https://crossweavesourcing.com/products/published-product');
      expect(urls).not.toContain('https://crossweavesourcing.com/products/hidden-product');
      expect(urls).toContain('https://crossweavesourcing.com/categories/visible-category');
      expect(urls).not.toContain('https://crossweavesourcing.com/categories/hidden-category');
      expect(urls).toContain('https://crossweavesourcing.com/catalogs/catalog-1');

      // Ensure no private routes
      expect(urls.some(url => url.includes('/dashboard'))).toBe(false);
      expect(urls.some(url => url.includes('/api'))).toBe(false);
    });
  });

  describe('Dashboard Layout', () => {
    it('should export noindex, nofollow metadata', () => {
      expect(dashboardMetadata).toBeDefined();
      expect(dashboardMetadata.robots).toEqual({
        index: false,
        follow: false,
      });
    });
  });
});
