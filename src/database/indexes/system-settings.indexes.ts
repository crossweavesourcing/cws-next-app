import type { IndexDescription } from 'mongodb';

export const systemSettingsIndexes: IndexDescription[] = [
  { key: { key: 1 }, unique: true, name: 'system_settings_key_idx' },
];
