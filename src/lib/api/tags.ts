export const TAGS = {
  HEALTH: 'Health',
  GENERAL: 'General',
  AUTH: 'Authentication',
  MOBILE_AUTH: 'Mobile Authentication',
  USERS: 'Users',
} as const;

export type TagValue = (typeof TAGS)[keyof typeof TAGS];
