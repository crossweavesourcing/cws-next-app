import type { IndexDescription } from 'mongodb';

export const userPhonesIndexes: IndexDescription[] = [
  // 1. Global uniqueness on E.164 phone number; sparse allows future nullable support.
  {
    key:    { e164: 1 },
    unique: true,
    sparse: true,
    name:   'uidx_e164',
  },
  // 2. List all phone numbers for a given user.
  {
    key:  { userId: 1 },
    name: 'idx_userId',
  },
  // 3. Enforce one primary phone per user at the database layer.
  {
    key:    { userId: 1, primary: 1 },
    unique: true,
    partialFilterExpression: { primary: true },
    name:   'uidx_userId_primary',
  },
];
