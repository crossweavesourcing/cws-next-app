import type { IndexDescription } from 'mongodb';

export const productsIndexes: IndexDescription[] = [
  {
    key: { slug: 1 },
    name: 'idx_products_slug_unique',
    unique: true,
  },
  {
    key: { categoryId: 1 },
    name: 'idx_products_category_id',
  },
];
