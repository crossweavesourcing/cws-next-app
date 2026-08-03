import type { Collection } from 'mongodb';
import { getDb } from '@/database/client';
import { COLLECTION_NAMES } from '@/database/constants';
import type {
  UserDocument,
  UserEmailDocument,
  UserPhoneDocument,
  OAuthAccountDocument,
  DeviceDocument,
  SessionDocument,
  RefreshTokenDocument,
  VerificationTokenDocument,
  OtpCodeDocument,
  RecoveryCodeDocument,
  AuditLogDocument,
  LoginAttemptDocument,
  PasswordPolicyDocument,
  PasswordHistoryDocument,
  TOTPCredentialDocument,
  WebAuthnCredentialDocument,
  WebAuthnChallengeDocument,
  MobileAuthChallengeDocument,
} from '@/types/auth';
import type { CatalogDocument, CategoryDocument, ProductDocument } from '@/types/catalog';
import type { SectionDocument } from '@/types/section';
import type { GlobalSettingsDocument, RedirectDocument } from '@/types/seo';

// ─────────────────────────────────────────────────────────────────────────────
// Typed Collection Accessors — all 11 collections in one file.
//
// Usage: const users = await getUsersCollection();
//        const doc = await users.findOne({ _id });
//
// RULE: All collection name strings come from COLLECTION_NAMES — no raw strings.
// ─────────────────────────────────────────────────────────────────────────────

export const getUsersCollection =
  (): Promise<Collection<UserDocument>> =>
    getDb().then(db => db.collection<UserDocument>(COLLECTION_NAMES.USERS));

export const getUserEmailsCollection =
  (): Promise<Collection<UserEmailDocument>> =>
    getDb().then(db => db.collection<UserEmailDocument>(COLLECTION_NAMES.USER_EMAILS));

export const getUserPhonesCollection =
  (): Promise<Collection<UserPhoneDocument>> =>
    getDb().then(db => db.collection<UserPhoneDocument>(COLLECTION_NAMES.USER_PHONES));

export const getOAuthAccountsCollection =
  (): Promise<Collection<OAuthAccountDocument>> =>
    getDb().then(db => db.collection<OAuthAccountDocument>(COLLECTION_NAMES.OAUTH_ACCOUNTS));

export const getDevicesCollection =
  (): Promise<Collection<DeviceDocument>> =>
    getDb().then(db => db.collection<DeviceDocument>(COLLECTION_NAMES.DEVICES));

export const getSessionsCollection =
  (): Promise<Collection<SessionDocument>> =>
    getDb().then(db => db.collection<SessionDocument>(COLLECTION_NAMES.SESSIONS));

export const getRefreshTokensCollection =
  (): Promise<Collection<RefreshTokenDocument>> =>
    getDb().then(db => db.collection<RefreshTokenDocument>(COLLECTION_NAMES.REFRESH_TOKENS));

export const getVerificationTokensCollection =
  (): Promise<Collection<VerificationTokenDocument>> =>
    getDb().then(db => db.collection<VerificationTokenDocument>(COLLECTION_NAMES.VERIFICATION_TOKENS));

export const getPasswordPoliciesCollection =
  (): Promise<Collection<PasswordPolicyDocument>> =>
    getDb().then(db => db.collection<PasswordPolicyDocument>(COLLECTION_NAMES.PASSWORD_POLICIES));

export const getPasswordHistoryCollection =
  (): Promise<Collection<PasswordHistoryDocument>> =>
    getDb().then(db => db.collection<PasswordHistoryDocument>(COLLECTION_NAMES.PASSWORD_HISTORY));

export const getOtpCodesCollection =
  (): Promise<Collection<OtpCodeDocument>> =>
    getDb().then(db => db.collection<OtpCodeDocument>(COLLECTION_NAMES.OTP_CODES));

export const getRecoveryCodesCollection =
  (): Promise<Collection<RecoveryCodeDocument>> =>
    getDb().then(db => db.collection<RecoveryCodeDocument>(COLLECTION_NAMES.RECOVERY_CODES));

export const getAuditLogsCollection =
  (): Promise<Collection<AuditLogDocument>> =>
    getDb().then(db => db.collection<AuditLogDocument>(COLLECTION_NAMES.AUDIT_LOGS));

export const getLoginAttemptsCollection =
  (): Promise<Collection<LoginAttemptDocument>> =>
    getDb().then(db => db.collection<LoginAttemptDocument>(COLLECTION_NAMES.LOGIN_ATTEMPTS));

export const getTotpCredentialsCollection =
  (): Promise<Collection<TOTPCredentialDocument>> =>
    getDb().then(db => db.collection<TOTPCredentialDocument>(COLLECTION_NAMES.TOTP_CREDENTIALS));

export const getWebAuthnCredentialsCollection =
  (): Promise<Collection<WebAuthnCredentialDocument>> =>
    getDb().then(db => db.collection<WebAuthnCredentialDocument>(COLLECTION_NAMES.WEBAUTHN_CREDENTIALS));

export const getWebAuthnChallengesCollection =
  (): Promise<Collection<WebAuthnChallengeDocument>> =>
    getDb().then(db => db.collection<WebAuthnChallengeDocument>(COLLECTION_NAMES.WEBAUTHN_CHALLENGES));

export const getMobileAuthChallengesCollection =
  (): Promise<Collection<MobileAuthChallengeDocument>> =>
    getDb().then(db => db.collection<MobileAuthChallengeDocument>(COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES));

export const getCategoriesCollection =
  (): Promise<Collection<CategoryDocument>> =>
    getDb().then(db => db.collection<CategoryDocument>(COLLECTION_NAMES.CATEGORIES));

export const getProductsCollection =
  (): Promise<Collection<ProductDocument>> =>
    getDb().then(db => db.collection<ProductDocument>(COLLECTION_NAMES.PRODUCTS));

export const getCatalogDocumentsCollection =
  (): Promise<Collection<CatalogDocument>> =>
    getDb().then(db => db.collection<CatalogDocument>(COLLECTION_NAMES.CATALOG_DOCUMENTS));

export const getSectionsCollection =
  (): Promise<Collection<SectionDocument>> =>
    getDb().then(db => db.collection<SectionDocument>(COLLECTION_NAMES.SECTIONS));

export const getGlobalSettingsCollection =
  (): Promise<Collection<GlobalSettingsDocument>> =>
    getDb().then(db => db.collection<GlobalSettingsDocument>(COLLECTION_NAMES.GLOBAL_SETTINGS));

export const getRedirectsCollection =
  (): Promise<Collection<RedirectDocument>> =>
    getDb().then(db => db.collection<RedirectDocument>(COLLECTION_NAMES.REDIRECTS));
