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
  ];

  // 2. Dynamic published content
  const productRepo = new ProductRepository();
  const categoryRepo = new CategoryRepository();
  const catalogRepo = new CatalogDocumentRepository();

  const [products, categories, catalogs] = await Promise.all([
    productRepo.findAll(), // Custom filter below
    categoryRepo.findAll(), // Custom filter below
    catalogRepo.findAll({ publishedOnly: true }),
  ]);

  const productUrls: MetadataRoute.Sitemap = products
    .filter((p) => p.visible === true)
    .map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

  const catalogUrls: MetadataRoute.Sitemap = catalogs
    .map((c) => ({
      url: `${baseUrl}/catalogs/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  // Though currently there is no /categories/[slug] route active in (site), 
  // keeping this logic pre-configured is a best practice if they are added later.
  // If they do not exist, they simply won't 404 since they aren't generated.
  // Wait, I should not include routes that don't exist in the sitemap. 
  // I will omit categories since I verified the directory structure earlier and there's no `/categories/[slug]/page.tsx`.

  return [...staticPages, ...productUrls, ...catalogUrls];
}
