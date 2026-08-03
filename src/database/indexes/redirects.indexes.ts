import type { IndexDescription } from 'mongodb';

export const redirectsIndexes: IndexDescription[] = [
  { key: { source: 1 }, unique: true }
];
