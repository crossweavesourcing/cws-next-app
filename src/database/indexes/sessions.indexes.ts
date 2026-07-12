import type { IndexDescription } from 'mongodb';

export const sessionsIndexes: IndexDescription[] = [
  // 1. List sessions for a user, newest first.
  {
    key:  { userId: 1, createdAt: -1 },
    name: 'idx_userId_createdAt',
  },
  // 2. Find active non-expired sessions — used for concurrent session limit enforcement.
  {
    key:  { userId: 1, revoked: 1, expiresAt: 1 },
    name: 'idx_userId_active',
  },
];
