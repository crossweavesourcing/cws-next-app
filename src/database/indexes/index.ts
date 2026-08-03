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
import { systemSettingsIndexes }     from './system-settings.indexes';
import { passwordPoliciesIndexes }   from './password-policies.indexes';
import { passwordHistoryIndexes }    from './password-history.indexes';
import { recoveryCodesIndexes }       from './recovery-codes.indexes';
import { totpCredentialsIndexes }     from './totp-credentials.indexes';
import { webauthnCredentialsIndexes } from './webauthn-credentials.indexes';
import { webauthnChallengesIndexes } from './webauthn-challenges.indexes';
import { mobileAuthChallengesIndexes } from './mobile-auth-challenges.indexes';
import { pendingAuthenticationsIndexes } from './pending-authentications.indexes';
import { categoriesIndexes } from './categories.indexes';
import { productsIndexes } from './products.indexes';
import { catalogDocumentsIndexes } from './catalog-documents.indexes';
import { sectionsIndexes } from './sections.indexes';
import { globalSettingsIndexes } from './global-settings.indexes';
import { redirectsIndexes } from './redirects.indexes';

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
  [COLLECTION_NAMES.SYSTEM_SETTINGS]:     systemSettingsIndexes,
  [COLLECTION_NAMES.PASSWORD_POLICIES]:   passwordPoliciesIndexes,
  [COLLECTION_NAMES.PASSWORD_HISTORY]:    passwordHistoryIndexes,
  [COLLECTION_NAMES.RECOVERY_CODES]:      recoveryCodesIndexes,
  [COLLECTION_NAMES.TOTP_CREDENTIALS]:    totpCredentialsIndexes,
  [COLLECTION_NAMES.WEBAUTHN_CREDENTIALS]: webauthnCredentialsIndexes,
  [COLLECTION_NAMES.WEBAUTHN_CHALLENGES]: webauthnChallengesIndexes,
  [COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES]: mobileAuthChallengesIndexes,
  [COLLECTION_NAMES.PENDING_AUTHENTICATIONS]: pendingAuthenticationsIndexes,
  [COLLECTION_NAMES.CATEGORIES]: categoriesIndexes,
  [COLLECTION_NAMES.PRODUCTS]: productsIndexes,
  [COLLECTION_NAMES.CATALOG_DOCUMENTS]: catalogDocumentsIndexes,
  [COLLECTION_NAMES.SECTIONS]: sectionsIndexes,
  [COLLECTION_NAMES.GLOBAL_SETTINGS]: globalSettingsIndexes,
  [COLLECTION_NAMES.REDIRECTS]: redirectsIndexes,
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
  systemSettingsIndexes,
  passwordPoliciesIndexes,
  passwordHistoryIndexes,
  recoveryCodesIndexes,
  totpCredentialsIndexes,
  webauthnCredentialsIndexes,
  webauthnChallengesIndexes,
  mobileAuthChallengesIndexes,
  pendingAuthenticationsIndexes,
  categoriesIndexes,
  productsIndexes,
  catalogDocumentsIndexes,
  sectionsIndexes,
  globalSettingsIndexes,
  redirectsIndexes,
};
