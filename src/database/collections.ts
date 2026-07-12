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
  AuditLogDocument,
  LoginAttemptDocument,
} from '@/types/auth';

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

export const getOtpCodesCollection =
  (): Promise<Collection<OtpCodeDocument>> =>
    getDb().then(db => db.collection<OtpCodeDocument>(COLLECTION_NAMES.OTP_CODES));

export const getAuditLogsCollection =
  (): Promise<Collection<AuditLogDocument>> =>
    getDb().then(db => db.collection<AuditLogDocument>(COLLECTION_NAMES.AUDIT_LOGS));

export const getLoginAttemptsCollection =
  (): Promise<Collection<LoginAttemptDocument>> =>
    getDb().then(db => db.collection<LoginAttemptDocument>(COLLECTION_NAMES.LOGIN_ATTEMPTS));
