import type { IndexDescription } from 'mongodb';

export const passwordHistoryIndexes: IndexDescription[] = [
  { key: { userId: 1, createdAt: -1 }, name: 'password_history_user_idx' },
];
