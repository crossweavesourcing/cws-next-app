import type { IndexDescription } from 'mongodb';

export const sessionsIndexes: IndexDescription[] = [
  // 1. Cookie lookup key. Sessions are fetched by their `_id` (ObjectId stored
  //    in the signed cws_session cookie), which is implicitly unique — no extra
  //    index needed. This index lists a user's sessions, newest first.
  {
    key:  { userId: 1, createdAt: -1 },
    name: 'idx_userId_createdAt',
  },
  // 2. Find active non-expired sessions — used for concurrent session limit
  //    enforcement and the cleanup sweep. Ordered exactly (userId, revoked,
  //    expiresAt) so a single index serves both "active sessions for user" and
  //    "expired/revoked for user" queries.
  {
    key:  { userId: 1, revoked: 1, expiresAt: 1 },
    name: 'idx_userId_revoked_expiresAt',
  },
  // 3. Pointer to the current refresh token for a session; used to validate
  //    the rotation-chain head and for O(1) "is this the current token?" checks.
  {
    key:  { latestRefreshTokenId: 1 },
    name: 'idx_latestRefreshTokenId',
  },
  // 4. Expired-session sweep. Lets the maintenance job find (expiresAt < now)
  //    rows without a collection scan.
  {
    key:  { expiresAt: 1 },
    name: 'idx_expiresAt',
  },
];
