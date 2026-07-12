import type { IndexDescription } from 'mongodb';

export const verificationTokensIndexes: IndexDescription[] = [
  // 1. Token validation on link click.
  {
    key:    { tokenHash: 1 },
    unique: true,
    name:   'uidx_tokenHash',
  },
  // 2. Check for existing active token before issuing a new one.
  //    Sparse because userId is null for invite tokens.
  {
    key:    { userId: 1, type: 1 },
    sparse: true,
    name:   'idx_userId_type',
  },
  // 3. TTL — auto-delete expired tokens.
  {
    key:               { expiresAt: 1 },
    expireAfterSeconds: 0,
    name:              'ttl_expiresAt',
  },
];
