import type { IndexDescription } from 'mongodb';

export const categoriesIndexes: IndexDescription[] = [
  {
    key: { slug: 1 },
    name: 'idx_categories_slug_unique',
    unique: true,
  },
  {
    key: { name: 1 },
    name: 'idx_categories_name_unique',
    unique: true,
  },
];
