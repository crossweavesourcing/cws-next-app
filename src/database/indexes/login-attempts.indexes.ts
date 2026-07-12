import type { IndexDescription } from 'mongodb';

export const loginAttemptsIndexes: IndexDescription[] = [
  // 1. IP-based rate limiting: count attempts from an IP in a time window.
  {
    key:  { ipAddress: 1, createdAt: -1 },
    name: 'idx_ipAddress_createdAt',
  },
  // 2. Per-identifier rate limiting: count attempts per email/phone in a window.
  {
    key:  { identifier: 1, identifierType: 1, createdAt: -1 },
    name: 'idx_identifier_createdAt',
  },
  // 3. TTL — 24-hour default retention.
  //    Tune via collMod for geo-anomaly or compliance requirements.
  {
    key:               { createdAt: 1 },
    expireAfterSeconds: 86_400, // 24 hours
    name:              'ttl_createdAt',
  },
];
