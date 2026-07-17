import type { IndexDescription } from 'mongodb';

export const webauthnCredentialsIndexes: IndexDescription[] = [
  // 1. Query all passkeys for a user.
  {
    key: { userId: 1 },
    name: 'idx_userId',
  },
  // 2. Look up a passkey by its credential ID (must be unique).
  {
    key: { credentialID: 1 },
    name: 'uniq_credentialID',
    unique: true,
  },
];
