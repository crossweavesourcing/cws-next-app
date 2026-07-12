import type { IndexDescription } from 'mongodb';

export const permissionsIndexes: IndexDescription[] = [
  { key: { action: 1, resource: 1 }, unique: true, name: 'permissions_action_resource_idx' },
];
