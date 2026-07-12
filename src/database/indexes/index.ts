import type { IndexDescription } from 'mongodb';
import type { CollectionName } from '@/database/constants';
import { COLLECTION_NAMES } from '@/database/constants';
import { usersIndexes }              from './users.indexes';
import { userEmailsIndexes }         from './user-emails.indexes';
import { userPhonesIndexes }         from './user-phones.indexes';
import { oauthAccountsIndexes }      from './oauth-accounts.indexes';
import { devicesIndexes }            from './devices.indexes';
import { sessionsIndexes }           from './sessions.indexes';
import { refreshTokensIndexes }      from './refresh-tokens.indexes';
import { verificationTokensIndexes } from './verification-tokens.indexes';
import { otpCodesIndexes }           from './otp-codes.indexes';
import { auditLogsIndexes }          from './audit-logs.indexes';
import { loginAttemptsIndexes }      from './login-attempts.indexes';

/**
 * Map of every collection name → its IndexDescription array.
 *
 * Typed as Record<CollectionName, IndexDescription[]> — TypeScript enforces
 * that every key in COLLECTION_NAMES has a corresponding index list.
 */
export const ALL_INDEXES: Record<CollectionName, IndexDescription[]> = {
  [COLLECTION_NAMES.USERS]:               usersIndexes,
  [COLLECTION_NAMES.USER_EMAILS]:         userEmailsIndexes,
  [COLLECTION_NAMES.USER_PHONES]:         userPhonesIndexes,
  [COLLECTION_NAMES.OAUTH_ACCOUNTS]:      oauthAccountsIndexes,
  [COLLECTION_NAMES.DEVICES]:             devicesIndexes,
  [COLLECTION_NAMES.SESSIONS]:            sessionsIndexes,
  [COLLECTION_NAMES.REFRESH_TOKENS]:      refreshTokensIndexes,
  [COLLECTION_NAMES.VERIFICATION_TOKENS]: verificationTokensIndexes,
  [COLLECTION_NAMES.OTP_CODES]:           otpCodesIndexes,
  [COLLECTION_NAMES.AUDIT_LOGS]:          auditLogsIndexes,
  [COLLECTION_NAMES.LOGIN_ATTEMPTS]:      loginAttemptsIndexes,
};

// Named re-exports
export {
  usersIndexes,
  userEmailsIndexes,
  userPhonesIndexes,
  oauthAccountsIndexes,
  devicesIndexes,
  sessionsIndexes,
  refreshTokensIndexes,
  verificationTokensIndexes,
  otpCodesIndexes,
  auditLogsIndexes,
  loginAttemptsIndexes,
};
