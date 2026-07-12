import type { IndexDescription } from 'mongodb';

export const auditLogsIndexes: IndexDescription[] = [
  // 1. User audit history, newest first.
  //    Sparse because userId is null for anonymous events.
  {
    key:    { userId: 1, createdAt: -1 },
    sparse: true,
    name:   'idx_userId_createdAt',
  },
  // 2. Security alerting: find all FAILURE events of a type in a time window.
  {
    key:  { action: 1, status: 1, createdAt: -1 },
    name: 'idx_action_status_createdAt',
  },
  // 3. TTL — 90-day default retention.
  //    Update via collMod. Archive to cold collection before reducing.
  {
    key:               { createdAt: 1 },
    expireAfterSeconds: 7_776_000, // 90 days
    name:              'ttl_createdAt',
  },
];
