import type { IndexDescription } from 'mongodb';

export const sectionsIndexes: IndexDescription[] = [
  { key: { sectionId: 1 }, unique: true, name: 'sections_sectionId_unique' },
  { key: { pageKey: 1 }, name: 'sections_pageKey' },
];
