import type { IndexDescription } from 'mongodb';

export const totpCredentialsIndexes: IndexDescription[] = [
  // 1. One TOTP configuration per user.
  {
    key: { userId: 1 },
    name: 'uniq_userId',
    unique: true,
  },
];
