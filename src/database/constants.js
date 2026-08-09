"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all MongoDB collection names.
//
// RULE: No raw collection name string ('users', 'sessions', etc.) may appear
// anywhere in src/database/ or scripts/. Always use COLLECTION_NAMES.<KEY>.
// A typo becomes a compile error, not a silent new collection.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTION_ORDER = exports.COLLECTION_NAMES = void 0;
exports.COLLECTION_NAMES = {
    USERS: 'users',
    USER_EMAILS: 'user_emails',
    USER_PHONES: 'user_phones',
    OAUTH_ACCOUNTS: 'oauth_accounts',
    DEVICES: 'devices',
    SESSIONS: 'sessions',
    REFRESH_TOKENS: 'refresh_tokens',
    VERIFICATION_TOKENS: 'verification_tokens',
    OTP_CODES: 'otp_codes',
    RECOVERY_CODES: 'recovery_codes',
    AUDIT_LOGS: 'audit_logs',
    LOGIN_ATTEMPTS: 'login_attempts',
    SYSTEM_SETTINGS: 'system_settings',
    PASSWORD_POLICIES: 'password_policies',
    PASSWORD_HISTORY: 'password_history',
    TOTP_CREDENTIALS: 'totp_credentials',
    WEBAUTHN_CREDENTIALS: 'webauthn_credentials',
    WEBAUTHN_CHALLENGES: 'webauthn_challenges',
    MOBILE_AUTH_CHALLENGES: 'mobile_auth_challenges',
    PENDING_AUTHENTICATIONS: 'pending_authentications',
    CATEGORIES: 'categories',
    PRODUCTS: 'products',
    CATALOG_DOCUMENTS: 'catalog_documents',
    SECTIONS: 'sections',
    GLOBAL_SETTINGS: 'global_settings',
    REDIRECTS: 'redirects',
};
/**
 * Ordered list of collection names for the database initializer.
 * Order respects logical dependencies:
 *   users → contact collections → devices → sessions → tokens → logs
 *
 * TypeScript's `as const` + `readonly` prevents accidental mutation.
 */
exports.COLLECTION_ORDER = [
    exports.COLLECTION_NAMES.USERS,
    exports.COLLECTION_NAMES.USER_EMAILS,
    exports.COLLECTION_NAMES.USER_PHONES,
    exports.COLLECTION_NAMES.OAUTH_ACCOUNTS,
    exports.COLLECTION_NAMES.DEVICES,
    exports.COLLECTION_NAMES.SESSIONS,
    exports.COLLECTION_NAMES.REFRESH_TOKENS,
    exports.COLLECTION_NAMES.VERIFICATION_TOKENS,
    exports.COLLECTION_NAMES.OTP_CODES,
    exports.COLLECTION_NAMES.RECOVERY_CODES,
    exports.COLLECTION_NAMES.AUDIT_LOGS,
    exports.COLLECTION_NAMES.LOGIN_ATTEMPTS,
    exports.COLLECTION_NAMES.SYSTEM_SETTINGS,
    exports.COLLECTION_NAMES.PASSWORD_POLICIES,
    exports.COLLECTION_NAMES.PASSWORD_HISTORY,
    exports.COLLECTION_NAMES.TOTP_CREDENTIALS,
    exports.COLLECTION_NAMES.WEBAUTHN_CREDENTIALS,
    exports.COLLECTION_NAMES.WEBAUTHN_CHALLENGES,
    exports.COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES,
    exports.COLLECTION_NAMES.PENDING_AUTHENTICATIONS,
    exports.COLLECTION_NAMES.CATEGORIES,
    exports.COLLECTION_NAMES.PRODUCTS,
    exports.COLLECTION_NAMES.CATALOG_DOCUMENTS,
    exports.COLLECTION_NAMES.SECTIONS,
    exports.COLLECTION_NAMES.GLOBAL_SETTINGS,
    exports.COLLECTION_NAMES.REDIRECTS,
];
