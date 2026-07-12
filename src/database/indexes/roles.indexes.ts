import type { IndexDescription } from 'mongodb';

export const rolesIndexes: IndexDescription[] = [
  { key: { slug: 1 }, unique: true, name: 'roles_slug_idx' },
];
