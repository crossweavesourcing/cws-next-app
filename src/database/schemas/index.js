"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectsSchema = exports.globalSettingsSchema = exports.pendingAuthenticationsSchema = exports.sectionsSchema = exports.catalogDocumentsSchema = exports.productsSchema = exports.categoriesSchema = exports.mobileAuthChallengesSchema = exports.webauthnChallengesSchema = exports.webauthnCredentialsSchema = exports.totpCredentialsSchema = exports.passwordHistorySchema = exports.passwordPoliciesSchema = exports.systemSettingsSchema = exports.loginAttemptsSchema = exports.auditLogsSchema = exports.recoveryCodesSchema = exports.otpCodesSchema = exports.verificationTokensSchema = exports.refreshTokensSchema = exports.sessionsSchema = exports.devicesSchema = exports.oauthAccountsSchema = exports.userPhonesSchema = exports.userEmailsSchema = exports.usersSchema = exports.ALL_SCHEMAS = void 0;
var constants_1 = require("@/database/constants");
var users_schema_1 = require("./users.schema");
Object.defineProperty(exports, "usersSchema", { enumerable: true, get: function () { return users_schema_1.usersSchema; } });
var user_emails_schema_1 = require("./user-emails.schema");
Object.defineProperty(exports, "userEmailsSchema", { enumerable: true, get: function () { return user_emails_schema_1.userEmailsSchema; } });
var user_phones_schema_1 = require("./user-phones.schema");
Object.defineProperty(exports, "userPhonesSchema", { enumerable: true, get: function () { return user_phones_schema_1.userPhonesSchema; } });
var oauth_accounts_schema_1 = require("./oauth-accounts.schema");
Object.defineProperty(exports, "oauthAccountsSchema", { enumerable: true, get: function () { return oauth_accounts_schema_1.oauthAccountsSchema; } });
var devices_schema_1 = require("./devices.schema");
Object.defineProperty(exports, "devicesSchema", { enumerable: true, get: function () { return devices_schema_1.devicesSchema; } });
var sessions_schema_1 = require("./sessions.schema");
Object.defineProperty(exports, "sessionsSchema", { enumerable: true, get: function () { return sessions_schema_1.sessionsSchema; } });
var refresh_tokens_schema_1 = require("./refresh-tokens.schema");
Object.defineProperty(exports, "refreshTokensSchema", { enumerable: true, get: function () { return refresh_tokens_schema_1.refreshTokensSchema; } });
var verification_tokens_schema_1 = require("./verification-tokens.schema");
Object.defineProperty(exports, "verificationTokensSchema", { enumerable: true, get: function () { return verification_tokens_schema_1.verificationTokensSchema; } });
var otp_codes_schema_1 = require("./otp-codes.schema");
Object.defineProperty(exports, "otpCodesSchema", { enumerable: true, get: function () { return otp_codes_schema_1.otpCodesSchema; } });
var recovery_codes_schema_1 = require("./recovery-codes.schema");
Object.defineProperty(exports, "recoveryCodesSchema", { enumerable: true, get: function () { return recovery_codes_schema_1.recoveryCodesSchema; } });
var audit_logs_schema_1 = require("./audit-logs.schema");
Object.defineProperty(exports, "auditLogsSchema", { enumerable: true, get: function () { return audit_logs_schema_1.auditLogsSchema; } });
var login_attempts_schema_1 = require("./login-attempts.schema");
Object.defineProperty(exports, "loginAttemptsSchema", { enumerable: true, get: function () { return login_attempts_schema_1.loginAttemptsSchema; } });
var system_settings_schema_1 = require("./system-settings.schema");
Object.defineProperty(exports, "systemSettingsSchema", { enumerable: true, get: function () { return system_settings_schema_1.systemSettingsSchema; } });
var password_policies_schema_1 = require("./password-policies.schema");
Object.defineProperty(exports, "passwordPoliciesSchema", { enumerable: true, get: function () { return password_policies_schema_1.passwordPoliciesSchema; } });
var password_history_schema_1 = require("./password-history.schema");
Object.defineProperty(exports, "passwordHistorySchema", { enumerable: true, get: function () { return password_history_schema_1.passwordHistorySchema; } });
var totp_credentials_schema_1 = require("./totp-credentials.schema");
Object.defineProperty(exports, "totpCredentialsSchema", { enumerable: true, get: function () { return totp_credentials_schema_1.totpCredentialsSchema; } });
var webauthn_credentials_schema_1 = require("./webauthn-credentials.schema");
Object.defineProperty(exports, "webauthnCredentialsSchema", { enumerable: true, get: function () { return webauthn_credentials_schema_1.webauthnCredentialsSchema; } });
var webauthn_challenges_schema_1 = require("./webauthn-challenges.schema");
Object.defineProperty(exports, "webauthnChallengesSchema", { enumerable: true, get: function () { return webauthn_challenges_schema_1.webauthnChallengesSchema; } });
var mobile_auth_challenges_schema_1 = require("./mobile-auth-challenges.schema");
Object.defineProperty(exports, "mobileAuthChallengesSchema", { enumerable: true, get: function () { return mobile_auth_challenges_schema_1.mobileAuthChallengesSchema; } });
var categories_schema_1 = require("./categories.schema");
Object.defineProperty(exports, "categoriesSchema", { enumerable: true, get: function () { return categories_schema_1.categoriesSchema; } });
var products_schema_1 = require("./products.schema");
Object.defineProperty(exports, "productsSchema", { enumerable: true, get: function () { return products_schema_1.productsSchema; } });
var catalog_documents_schema_1 = require("./catalog-documents.schema");
Object.defineProperty(exports, "catalogDocumentsSchema", { enumerable: true, get: function () { return catalog_documents_schema_1.catalogDocumentsSchema; } });
var sections_schema_1 = require("./sections.schema");
Object.defineProperty(exports, "sectionsSchema", { enumerable: true, get: function () { return sections_schema_1.sectionsSchema; } });
var pending_authentications_schema_1 = require("./pending-authentications.schema");
Object.defineProperty(exports, "pendingAuthenticationsSchema", { enumerable: true, get: function () { return pending_authentications_schema_1.pendingAuthenticationsSchema; } });
var global_settings_schema_1 = require("./global-settings.schema");
Object.defineProperty(exports, "globalSettingsSchema", { enumerable: true, get: function () { return global_settings_schema_1.globalSettingsSchema; } });
var redirects_schema_1 = require("./redirects.schema");
Object.defineProperty(exports, "redirectsSchema", { enumerable: true, get: function () { return redirects_schema_1.redirectsSchema; } });
/**
 * Map of every collection name → its $jsonSchema body.
 *
 * Typed as Record<CollectionName, Document> — TypeScript enforces
 * that every key in COLLECTION_NAMES has a corresponding schema.
 * Adding a new collection to COLLECTION_NAMES without adding it here
 * produces a compile-time error.
 */
exports.ALL_SCHEMAS = (_a = {},
    _a[constants_1.COLLECTION_NAMES.USERS] = users_schema_1.usersSchema,
    _a[constants_1.COLLECTION_NAMES.USER_EMAILS] = user_emails_schema_1.userEmailsSchema,
    _a[constants_1.COLLECTION_NAMES.USER_PHONES] = user_phones_schema_1.userPhonesSchema,
    _a[constants_1.COLLECTION_NAMES.OAUTH_ACCOUNTS] = oauth_accounts_schema_1.oauthAccountsSchema,
    _a[constants_1.COLLECTION_NAMES.DEVICES] = devices_schema_1.devicesSchema,
    _a[constants_1.COLLECTION_NAMES.SESSIONS] = sessions_schema_1.sessionsSchema,
    _a[constants_1.COLLECTION_NAMES.REFRESH_TOKENS] = refresh_tokens_schema_1.refreshTokensSchema,
    _a[constants_1.COLLECTION_NAMES.VERIFICATION_TOKENS] = verification_tokens_schema_1.verificationTokensSchema,
    _a[constants_1.COLLECTION_NAMES.OTP_CODES] = otp_codes_schema_1.otpCodesSchema,
    _a[constants_1.COLLECTION_NAMES.RECOVERY_CODES] = recovery_codes_schema_1.recoveryCodesSchema,
    _a[constants_1.COLLECTION_NAMES.AUDIT_LOGS] = audit_logs_schema_1.auditLogsSchema,
    _a[constants_1.COLLECTION_NAMES.LOGIN_ATTEMPTS] = login_attempts_schema_1.loginAttemptsSchema,
    _a[constants_1.COLLECTION_NAMES.SYSTEM_SETTINGS] = system_settings_schema_1.systemSettingsSchema,
    _a[constants_1.COLLECTION_NAMES.PASSWORD_POLICIES] = password_policies_schema_1.passwordPoliciesSchema,
    _a[constants_1.COLLECTION_NAMES.PASSWORD_HISTORY] = password_history_schema_1.passwordHistorySchema,
    _a[constants_1.COLLECTION_NAMES.TOTP_CREDENTIALS] = totp_credentials_schema_1.totpCredentialsSchema,
    _a[constants_1.COLLECTION_NAMES.WEBAUTHN_CREDENTIALS] = webauthn_credentials_schema_1.webauthnCredentialsSchema,
    _a[constants_1.COLLECTION_NAMES.WEBAUTHN_CHALLENGES] = webauthn_challenges_schema_1.webauthnChallengesSchema,
    _a[constants_1.COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES] = mobile_auth_challenges_schema_1.mobileAuthChallengesSchema,
    _a[constants_1.COLLECTION_NAMES.CATEGORIES] = categories_schema_1.categoriesSchema,
    _a[constants_1.COLLECTION_NAMES.PRODUCTS] = products_schema_1.productsSchema,
    _a[constants_1.COLLECTION_NAMES.CATALOG_DOCUMENTS] = catalog_documents_schema_1.catalogDocumentsSchema,
    _a[constants_1.COLLECTION_NAMES.SECTIONS] = sections_schema_1.sectionsSchema,
    _a[constants_1.COLLECTION_NAMES.PENDING_AUTHENTICATIONS] = pending_authentications_schema_1.pendingAuthenticationsSchema,
    _a[constants_1.COLLECTION_NAMES.GLOBAL_SETTINGS] = global_settings_schema_1.globalSettingsSchema,
    _a[constants_1.COLLECTION_NAMES.REDIRECTS] = redirects_schema_1.redirectsSchema,
    _a);
