import { MetadataRoute } from 'next';
import { getEnv } from '@/auth/config/env';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { CatalogDocumentRepository } from '@/auth/repositories/catalog-document.repository';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getEnv();
  const baseUrl = env.APP_URL;

  // 1. Static Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/accessibility`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 2. Dynamic published content
  const productRepo = new ProductRepository();
  const categoryRepo = new CategoryRepository();
  const catalogRepo = new CatalogDocumentRepository();

  const [products, categories, catalogs] = await Promise.all([
    productRepo.findAll(), // Custom filter below
    categoryRepo.findAll(),
    catalogRepo.findAll({ publishedOnly: true }),
  ]);

  const productUrls: MetadataRoute.Sitemap = products
    .filter((p) => p.visible === true && !p.seoOverrides?.noindex && p.seoOverrides?.includeInSitemap !== false)
    .map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((category) => category.visible === true && !category.seoOverrides?.noindex && category.seoOverrides?.includeInSitemap !== false)
    .map((category) => ({
      url: `${baseUrl}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.75,
    }));

  const catalogUrls: MetadataRoute.Sitemap = catalogs
    .filter((c) => !c.seoOverrides?.noindex && c.seoOverrides?.includeInSitemap !== false)
    .map((c) => ({
      url: `${baseUrl}/catalogs/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  return [...staticPages, ...productUrls, ...categoryUrls, ...catalogUrls];
}
