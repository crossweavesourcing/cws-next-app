import type { IndexDescription } from 'mongodb';

export const otpCodesIndexes: IndexDescription[] = [
  // 1. Find the active non-consumed non-expired OTP for a phone number.
  {
    key:  { e164: 1, consumed: 1, expiresAt: 1 },
    name: 'idx_e164_active',
  },
  // 2. TTL — auto-delete expired OTP codes.
  {
    key:               { expiresAt: 1 },
    expireAfterSeconds: 0,
    name:              'ttl_expiresAt',
  },
];
