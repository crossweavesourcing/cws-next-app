// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all MongoDB collection names.
//
// RULE: No raw collection name string ('users', 'sessions', etc.) may appear
// anywhere in src/database/ or scripts/. Always use COLLECTION_NAMES.<KEY>.
// A typo becomes a compile error, not a silent new collection.
// ─────────────────────────────────────────────────────────────────────────────

export const COLLECTION_NAMES = {
  USERS:               'users',
  USER_EMAILS:         'user_emails',
  USER_PHONES:         'user_phones',
  OAUTH_ACCOUNTS:      'oauth_accounts',
  DEVICES:             'devices',
  SESSIONS:            'sessions',
  REFRESH_TOKENS:      'refresh_tokens',
  VERIFICATION_TOKENS: 'verification_tokens',
  OTP_CODES:           'otp_codes',
  RECOVERY_CODES:      'recovery_codes',
  AUDIT_LOGS:          'audit_logs',
  LOGIN_ATTEMPTS:      'login_attempts',
  SYSTEM_SETTINGS:     'system_settings',
  PASSWORD_POLICIES:   'password_policies',
  PASSWORD_HISTORY:    'password_history',
  TOTP_CREDENTIALS:    'totp_credentials',
  WEBAUTHN_CREDENTIALS:'webauthn_credentials',
  WEBAUTHN_CHALLENGES: 'webauthn_challenges',
  MOBILE_AUTH_CHALLENGES: 'mobile_auth_challenges',
  PENDING_AUTHENTICATIONS: 'pending_authentications',
  CATEGORIES:          'categories',
  PRODUCTS:            'products',
  CATALOG_DOCUMENTS:   'catalog_documents',
  SECTIONS:            'sections',
  GLOBAL_SETTINGS:     'global_settings',
  REDIRECTS:           'redirects',
} as const;

/**
 * Union of all valid collection name strings.
 * Automatically derived — stays in sync with COLLECTION_NAMES.
 */
export type CollectionName = (typeof COLLECTION_NAMES)[keyof typeof COLLECTION_NAMES];

/**
 * Ordered list of collection names for the database initializer.
 * Order respects logical dependencies:
 *   users → contact collections → devices → sessions → tokens → logs
 *
 * TypeScript's `as const` + `readonly` prevents accidental mutation.
 */
export const COLLECTION_ORDER: readonly CollectionName[] = [
  COLLECTION_NAMES.USERS,
  COLLECTION_NAMES.USER_EMAILS,
  COLLECTION_NAMES.USER_PHONES,
  COLLECTION_NAMES.OAUTH_ACCOUNTS,
  COLLECTION_NAMES.DEVICES,
  COLLECTION_NAMES.SESSIONS,
  COLLECTION_NAMES.REFRESH_TOKENS,
  COLLECTION_NAMES.VERIFICATION_TOKENS,
  COLLECTION_NAMES.OTP_CODES,
  COLLECTION_NAMES.RECOVERY_CODES,
  COLLECTION_NAMES.AUDIT_LOGS,
  COLLECTION_NAMES.LOGIN_ATTEMPTS,
  COLLECTION_NAMES.SYSTEM_SETTINGS,
  COLLECTION_NAMES.PASSWORD_POLICIES,
  COLLECTION_NAMES.PASSWORD_HISTORY,
  COLLECTION_NAMES.TOTP_CREDENTIALS,
  COLLECTION_NAMES.WEBAUTHN_CREDENTIALS,
  COLLECTION_NAMES.WEBAUTHN_CHALLENGES,
  COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES,
  COLLECTION_NAMES.PENDING_AUTHENTICATIONS,
  COLLECTION_NAMES.CATEGORIES,
  COLLECTION_NAMES.PRODUCTS,
  COLLECTION_NAMES.CATALOG_DOCUMENTS,
  COLLECTION_NAMES.SECTIONS,
  COLLECTION_NAMES.GLOBAL_SETTINGS,
  COLLECTION_NAMES.REDIRECTS,
] as const;
