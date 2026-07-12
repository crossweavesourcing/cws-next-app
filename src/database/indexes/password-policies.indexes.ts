import type { IndexDescription } from 'mongodb';

export const passwordPoliciesIndexes: IndexDescription[] = [
  { key: { name: 1 }, unique: true, name: 'password_policies_name_idx' },
];
