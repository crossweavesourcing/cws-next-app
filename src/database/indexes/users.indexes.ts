import type { IndexDescription } from 'mongodb';

/** users collection indexes. */
export const usersIndexes: IndexDescription[] = [
  // TTL index to automatically remove soft-deleted users after 30 days (2592000 seconds)
  {
    key: { deletedAt: 1 },
    expireAfterSeconds: 2592000,
    name: 'idx_deletedAt_ttl',
  },
];
