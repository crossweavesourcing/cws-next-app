import type { Document } from 'mongodb';
import type { CollectionName } from '@/database/constants';
import { COLLECTION_NAMES } from '@/database/constants';
import { usersSchema }               from './users.schema';
import { userEmailsSchema }          from './user-emails.schema';
import { userPhonesSchema }          from './user-phones.schema';
import { oauthAccountsSchema }       from './oauth-accounts.schema';
import { devicesSchema }             from './devices.schema';
import { sessionsSchema }            from './sessions.schema';
import { refreshTokensSchema }       from './refresh-tokens.schema';
import { verificationTokensSchema }  from './verification-tokens.schema';
import { otpCodesSchema }            from './otp-codes.schema';
import { auditLogsSchema }           from './audit-logs.schema';
import { loginAttemptsSchema }       from './login-attempts.schema';

/**
 * Map of every collection name → its $jsonSchema body.
 *
 * Typed as Record<CollectionName, Document> — TypeScript enforces
 * that every key in COLLECTION_NAMES has a corresponding schema.
 * Adding a new collection to COLLECTION_NAMES without adding it here
 * produces a compile-time error.
 */
export const ALL_SCHEMAS: Record<CollectionName, Document> = {
  [COLLECTION_NAMES.USERS]:               usersSchema,
  [COLLECTION_NAMES.USER_EMAILS]:         userEmailsSchema,
  [COLLECTION_NAMES.USER_PHONES]:         userPhonesSchema,
  [COLLECTION_NAMES.OAUTH_ACCOUNTS]:      oauthAccountsSchema,
  [COLLECTION_NAMES.DEVICES]:             devicesSchema,
  [COLLECTION_NAMES.SESSIONS]:            sessionsSchema,
  [COLLECTION_NAMES.REFRESH_TOKENS]:      refreshTokensSchema,
  [COLLECTION_NAMES.VERIFICATION_TOKENS]: verificationTokensSchema,
  [COLLECTION_NAMES.OTP_CODES]:           otpCodesSchema,
  [COLLECTION_NAMES.AUDIT_LOGS]:          auditLogsSchema,
  [COLLECTION_NAMES.LOGIN_ATTEMPTS]:      loginAttemptsSchema,
};

// Named re-exports for direct import
export {
  usersSchema,
  userEmailsSchema,
  userPhonesSchema,
  oauthAccountsSchema,
  devicesSchema,
  sessionsSchema,
  refreshTokensSchema,
  verificationTokensSchema,
  otpCodesSchema,
  auditLogsSchema,
  loginAttemptsSchema,
};
