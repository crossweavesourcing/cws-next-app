import { cache } from 'react';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { CatalogDocumentRepository } from '@/auth/repositories/catalog-document.repository';

// Instantiate repositories once
const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();
const catalogRepo = new CatalogDocumentRepository();

/**
 * Deduplicated database queries for public pages using React's cache().
 * This ensures that if multiple components on the same page request the same data,
 * only one database query is executed per request.
 * 
 * NOTE: Do not use these functions for admin or authenticated routes.
 */

// Products
export const getCachedProducts = cache(async () => {
  return productRepo.findAll();
});

export const getCachedProductBySlug = cache(async (slug: string) => {
  return productRepo.findBySlug(slug);
});

// Categories
export const getCachedCategories = cache(async () => {
  return categoryRepo.findAll();
});

export const getCachedCategoryById = cache(async (id: string) => {
  return categoryRepo.findById(id);
});

export const getCachedProductsByCategoryId = cache(async (id: string) => {
  return productRepo.findByCategoryId(id);
});

// Catalogs
export const getCachedCatalogBySlug = cache(async (slug: string) => {
  return catalogRepo.findBySlug(slug);
});
