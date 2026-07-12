import type { IndexDescription } from 'mongodb';

export const refreshTokensIndexes: IndexDescription[] = [
  // 1. Primary lookup on every token exchange; O(1) validation.
  {
    key:    { tokenHash: 1 },
    unique: true,
    name:   'uidx_tokenHash',
  },
  // 2. Bulk-revoke all tokens for a session on logout.
  {
    key:  { sessionId: 1 },
    name: 'idx_sessionId',
  },
  // 3. Revoke all tokens for a user across all sessions (account compromise response).
  {
    key:  { userId: 1 },
    name: 'idx_userId',
  },
  // 4. TTL — auto-delete at the expiry date (expireAfterSeconds=0 means delete at expiresAt).
  {
    key:               { expiresAt: 1 },
    expireAfterSeconds: 0,
    name:              'ttl_expiresAt',
  },
];
