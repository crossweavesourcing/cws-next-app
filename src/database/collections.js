"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedirectsCollection = exports.getGlobalSettingsCollection = exports.getSectionsCollection = exports.getCatalogDocumentsCollection = exports.getProductsCollection = exports.getCategoriesCollection = exports.getMobileAuthChallengesCollection = exports.getWebAuthnChallengesCollection = exports.getWebAuthnCredentialsCollection = exports.getTotpCredentialsCollection = exports.getLoginAttemptsCollection = exports.getAuditLogsCollection = exports.getRecoveryCodesCollection = exports.getOtpCodesCollection = exports.getPasswordHistoryCollection = exports.getPasswordPoliciesCollection = exports.getVerificationTokensCollection = exports.getRefreshTokensCollection = exports.getSessionsCollection = exports.getDevicesCollection = exports.getOAuthAccountsCollection = exports.getUserPhonesCollection = exports.getUserEmailsCollection = exports.getUsersCollection = void 0;
var client_1 = require("@/database/client");
var constants_1 = require("@/database/constants");
// ─────────────────────────────────────────────────────────────────────────────
// Typed Collection Accessors — all 11 collections in one file.
//
// Usage: const users = await getUsersCollection();
//        const doc = await users.findOne({ _id });
//
// RULE: All collection name strings come from COLLECTION_NAMES — no raw strings.
// ─────────────────────────────────────────────────────────────────────────────
var getUsersCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.USERS); });
};
exports.getUsersCollection = getUsersCollection;
var getUserEmailsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.USER_EMAILS); });
};
exports.getUserEmailsCollection = getUserEmailsCollection;
var getUserPhonesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.USER_PHONES); });
};
exports.getUserPhonesCollection = getUserPhonesCollection;
var getOAuthAccountsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.OAUTH_ACCOUNTS); });
};
exports.getOAuthAccountsCollection = getOAuthAccountsCollection;
var getDevicesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.DEVICES); });
};
exports.getDevicesCollection = getDevicesCollection;
var getSessionsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.SESSIONS); });
};
exports.getSessionsCollection = getSessionsCollection;
var getRefreshTokensCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.REFRESH_TOKENS); });
};
exports.getRefreshTokensCollection = getRefreshTokensCollection;
var getVerificationTokensCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.VERIFICATION_TOKENS); });
};
exports.getVerificationTokensCollection = getVerificationTokensCollection;
var getPasswordPoliciesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.PASSWORD_POLICIES); });
};
exports.getPasswordPoliciesCollection = getPasswordPoliciesCollection;
var getPasswordHistoryCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.PASSWORD_HISTORY); });
};
exports.getPasswordHistoryCollection = getPasswordHistoryCollection;
var getOtpCodesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.OTP_CODES); });
};
exports.getOtpCodesCollection = getOtpCodesCollection;
var getRecoveryCodesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.RECOVERY_CODES); });
};
exports.getRecoveryCodesCollection = getRecoveryCodesCollection;
var getAuditLogsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.AUDIT_LOGS); });
};
exports.getAuditLogsCollection = getAuditLogsCollection;
var getLoginAttemptsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.LOGIN_ATTEMPTS); });
};
exports.getLoginAttemptsCollection = getLoginAttemptsCollection;
var getTotpCredentialsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.TOTP_CREDENTIALS); });
};
exports.getTotpCredentialsCollection = getTotpCredentialsCollection;
var getWebAuthnCredentialsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.WEBAUTHN_CREDENTIALS); });
};
exports.getWebAuthnCredentialsCollection = getWebAuthnCredentialsCollection;
var getWebAuthnChallengesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.WEBAUTHN_CHALLENGES); });
};
exports.getWebAuthnChallengesCollection = getWebAuthnChallengesCollection;
var getMobileAuthChallengesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES); });
};
exports.getMobileAuthChallengesCollection = getMobileAuthChallengesCollection;
var getCategoriesCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.CATEGORIES); });
};
exports.getCategoriesCollection = getCategoriesCollection;
var getProductsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.PRODUCTS); });
};
exports.getProductsCollection = getProductsCollection;
var getCatalogDocumentsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.CATALOG_DOCUMENTS); });
};
exports.getCatalogDocumentsCollection = getCatalogDocumentsCollection;
var getSectionsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.SECTIONS); });
};
exports.getSectionsCollection = getSectionsCollection;
var getGlobalSettingsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.GLOBAL_SETTINGS); });
};
exports.getGlobalSettingsCollection = getGlobalSettingsCollection;
var getRedirectsCollection = function () {
    return (0, client_1.getDb)().then(function (db) { return db.collection(constants_1.COLLECTION_NAMES.REDIRECTS); });
};
exports.getRedirectsCollection = getRedirectsCollection;
