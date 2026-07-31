import type { IndexDescription } from 'mongodb';

export const catalogDocumentsIndexes: IndexDescription[] = [
  { key: { slug: 1 }, name: 'idx_catalog_documents_slug_unique', unique: true },
  { key: { categoryId: 1, status: 1, updatedAt: -1 }, name: 'idx_catalog_documents_category_status_updated' },
  { key: { productId: 1, status: 1, updatedAt: -1 }, name: 'idx_catalog_documents_product_status_updated' },
];
