"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectsIndexes = exports.globalSettingsIndexes = exports.sectionsIndexes = exports.catalogDocumentsIndexes = exports.productsIndexes = exports.categoriesIndexes = exports.pendingAuthenticationsIndexes = exports.mobileAuthChallengesIndexes = exports.webauthnChallengesIndexes = exports.webauthnCredentialsIndexes = exports.totpCredentialsIndexes = exports.recoveryCodesIndexes = exports.passwordHistoryIndexes = exports.passwordPoliciesIndexes = exports.systemSettingsIndexes = exports.loginAttemptsIndexes = exports.auditLogsIndexes = exports.otpCodesIndexes = exports.verificationTokensIndexes = exports.refreshTokensIndexes = exports.sessionsIndexes = exports.devicesIndexes = exports.oauthAccountsIndexes = exports.userPhonesIndexes = exports.userEmailsIndexes = exports.usersIndexes = exports.ALL_INDEXES = void 0;
var constants_1 = require("@/database/constants");
var users_indexes_1 = require("./users.indexes");
Object.defineProperty(exports, "usersIndexes", { enumerable: true, get: function () { return users_indexes_1.usersIndexes; } });
var user_emails_indexes_1 = require("./user-emails.indexes");
Object.defineProperty(exports, "userEmailsIndexes", { enumerable: true, get: function () { return user_emails_indexes_1.userEmailsIndexes; } });
var user_phones_indexes_1 = require("./user-phones.indexes");
Object.defineProperty(exports, "userPhonesIndexes", { enumerable: true, get: function () { return user_phones_indexes_1.userPhonesIndexes; } });
var oauth_accounts_indexes_1 = require("./oauth-accounts.indexes");
Object.defineProperty(exports, "oauthAccountsIndexes", { enumerable: true, get: function () { return oauth_accounts_indexes_1.oauthAccountsIndexes; } });
var devices_indexes_1 = require("./devices.indexes");
Object.defineProperty(exports, "devicesIndexes", { enumerable: true, get: function () { return devices_indexes_1.devicesIndexes; } });
var sessions_indexes_1 = require("./sessions.indexes");
Object.defineProperty(exports, "sessionsIndexes", { enumerable: true, get: function () { return sessions_indexes_1.sessionsIndexes; } });
var refresh_tokens_indexes_1 = require("./refresh-tokens.indexes");
Object.defineProperty(exports, "refreshTokensIndexes", { enumerable: true, get: function () { return refresh_tokens_indexes_1.refreshTokensIndexes; } });
var verification_tokens_indexes_1 = require("./verification-tokens.indexes");
Object.defineProperty(exports, "verificationTokensIndexes", { enumerable: true, get: function () { return verification_tokens_indexes_1.verificationTokensIndexes; } });
var otp_codes_indexes_1 = require("./otp-codes.indexes");
Object.defineProperty(exports, "otpCodesIndexes", { enumerable: true, get: function () { return otp_codes_indexes_1.otpCodesIndexes; } });
var audit_logs_indexes_1 = require("./audit-logs.indexes");
Object.defineProperty(exports, "auditLogsIndexes", { enumerable: true, get: function () { return audit_logs_indexes_1.auditLogsIndexes; } });
var login_attempts_indexes_1 = require("./login-attempts.indexes");
Object.defineProperty(exports, "loginAttemptsIndexes", { enumerable: true, get: function () { return login_attempts_indexes_1.loginAttemptsIndexes; } });
var system_settings_indexes_1 = require("./system-settings.indexes");
Object.defineProperty(exports, "systemSettingsIndexes", { enumerable: true, get: function () { return system_settings_indexes_1.systemSettingsIndexes; } });
var password_policies_indexes_1 = require("./password-policies.indexes");
Object.defineProperty(exports, "passwordPoliciesIndexes", { enumerable: true, get: function () { return password_policies_indexes_1.passwordPoliciesIndexes; } });
var password_history_indexes_1 = require("./password-history.indexes");
Object.defineProperty(exports, "passwordHistoryIndexes", { enumerable: true, get: function () { return password_history_indexes_1.passwordHistoryIndexes; } });
var recovery_codes_indexes_1 = require("./recovery-codes.indexes");
Object.defineProperty(exports, "recoveryCodesIndexes", { enumerable: true, get: function () { return recovery_codes_indexes_1.recoveryCodesIndexes; } });
var totp_credentials_indexes_1 = require("./totp-credentials.indexes");
Object.defineProperty(exports, "totpCredentialsIndexes", { enumerable: true, get: function () { return totp_credentials_indexes_1.totpCredentialsIndexes; } });
var webauthn_credentials_indexes_1 = require("./webauthn-credentials.indexes");
Object.defineProperty(exports, "webauthnCredentialsIndexes", { enumerable: true, get: function () { return webauthn_credentials_indexes_1.webauthnCredentialsIndexes; } });
var webauthn_challenges_indexes_1 = require("./webauthn-challenges.indexes");
Object.defineProperty(exports, "webauthnChallengesIndexes", { enumerable: true, get: function () { return webauthn_challenges_indexes_1.webauthnChallengesIndexes; } });
var mobile_auth_challenges_indexes_1 = require("./mobile-auth-challenges.indexes");
Object.defineProperty(exports, "mobileAuthChallengesIndexes", { enumerable: true, get: function () { return mobile_auth_challenges_indexes_1.mobileAuthChallengesIndexes; } });
var pending_authentications_indexes_1 = require("./pending-authentications.indexes");
Object.defineProperty(exports, "pendingAuthenticationsIndexes", { enumerable: true, get: function () { return pending_authentications_indexes_1.pendingAuthenticationsIndexes; } });
var categories_indexes_1 = require("./categories.indexes");
Object.defineProperty(exports, "categoriesIndexes", { enumerable: true, get: function () { return categories_indexes_1.categoriesIndexes; } });
var products_indexes_1 = require("./products.indexes");
Object.defineProperty(exports, "productsIndexes", { enumerable: true, get: function () { return products_indexes_1.productsIndexes; } });
var catalog_documents_indexes_1 = require("./catalog-documents.indexes");
Object.defineProperty(exports, "catalogDocumentsIndexes", { enumerable: true, get: function () { return catalog_documents_indexes_1.catalogDocumentsIndexes; } });
var sections_indexes_1 = require("./sections.indexes");
Object.defineProperty(exports, "sectionsIndexes", { enumerable: true, get: function () { return sections_indexes_1.sectionsIndexes; } });
var global_settings_indexes_1 = require("./global-settings.indexes");
Object.defineProperty(exports, "globalSettingsIndexes", { enumerable: true, get: function () { return global_settings_indexes_1.globalSettingsIndexes; } });
var redirects_indexes_1 = require("./redirects.indexes");
Object.defineProperty(exports, "redirectsIndexes", { enumerable: true, get: function () { return redirects_indexes_1.redirectsIndexes; } });
/**
 * Map of every collection name → its IndexDescription array.
 *
 * Typed as Record<CollectionName, IndexDescription[]> — TypeScript enforces
 * that every key in COLLECTION_NAMES has a corresponding index list.
 */
exports.ALL_INDEXES = (_a = {},
    _a[constants_1.COLLECTION_NAMES.USERS] = users_indexes_1.usersIndexes,
    _a[constants_1.COLLECTION_NAMES.USER_EMAILS] = user_emails_indexes_1.userEmailsIndexes,
    _a[constants_1.COLLECTION_NAMES.USER_PHONES] = user_phones_indexes_1.userPhonesIndexes,
    _a[constants_1.COLLECTION_NAMES.OAUTH_ACCOUNTS] = oauth_accounts_indexes_1.oauthAccountsIndexes,
    _a[constants_1.COLLECTION_NAMES.DEVICES] = devices_indexes_1.devicesIndexes,
    _a[constants_1.COLLECTION_NAMES.SESSIONS] = sessions_indexes_1.sessionsIndexes,
    _a[constants_1.COLLECTION_NAMES.REFRESH_TOKENS] = refresh_tokens_indexes_1.refreshTokensIndexes,
    _a[constants_1.COLLECTION_NAMES.VERIFICATION_TOKENS] = verification_tokens_indexes_1.verificationTokensIndexes,
    _a[constants_1.COLLECTION_NAMES.OTP_CODES] = otp_codes_indexes_1.otpCodesIndexes,
    _a[constants_1.COLLECTION_NAMES.AUDIT_LOGS] = audit_logs_indexes_1.auditLogsIndexes,
    _a[constants_1.COLLECTION_NAMES.LOGIN_ATTEMPTS] = login_attempts_indexes_1.loginAttemptsIndexes,
    _a[constants_1.COLLECTION_NAMES.SYSTEM_SETTINGS] = system_settings_indexes_1.systemSettingsIndexes,
    _a[constants_1.COLLECTION_NAMES.PASSWORD_POLICIES] = password_policies_indexes_1.passwordPoliciesIndexes,
    _a[constants_1.COLLECTION_NAMES.PASSWORD_HISTORY] = password_history_indexes_1.passwordHistoryIndexes,
    _a[constants_1.COLLECTION_NAMES.RECOVERY_CODES] = recovery_codes_indexes_1.recoveryCodesIndexes,
    _a[constants_1.COLLECTION_NAMES.TOTP_CREDENTIALS] = totp_credentials_indexes_1.totpCredentialsIndexes,
    _a[constants_1.COLLECTION_NAMES.WEBAUTHN_CREDENTIALS] = webauthn_credentials_indexes_1.webauthnCredentialsIndexes,
    _a[constants_1.COLLECTION_NAMES.WEBAUTHN_CHALLENGES] = webauthn_challenges_indexes_1.webauthnChallengesIndexes,
    _a[constants_1.COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES] = mobile_auth_challenges_indexes_1.mobileAuthChallengesIndexes,
    _a[constants_1.COLLECTION_NAMES.PENDING_AUTHENTICATIONS] = pending_authentications_indexes_1.pendingAuthenticationsIndexes,
    _a[constants_1.COLLECTION_NAMES.CATEGORIES] = categories_indexes_1.categoriesIndexes,
    _a[constants_1.COLLECTION_NAMES.PRODUCTS] = products_indexes_1.productsIndexes,
    _a[constants_1.COLLECTION_NAMES.CATALOG_DOCUMENTS] = catalog_documents_indexes_1.catalogDocumentsIndexes,
    _a[constants_1.COLLECTION_NAMES.SECTIONS] = sections_indexes_1.sectionsIndexes,
    _a[constants_1.COLLECTION_NAMES.GLOBAL_SETTINGS] = global_settings_indexes_1.globalSettingsIndexes,
    _a[constants_1.COLLECTION_NAMES.REDIRECTS] = redirects_indexes_1.redirectsIndexes,
    _a);
