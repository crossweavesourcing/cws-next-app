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
import { recoveryCodesSchema }       from './recovery-codes.schema';
import { auditLogsSchema }           from './audit-logs.schema';
import { loginAttemptsSchema }       from './login-attempts.schema';
import { systemSettingsSchema }      from './system-settings.schema';
import { passwordPoliciesSchema }    from './password-policies.schema';
import { passwordHistorySchema }     from './password-history.schema';
import { totpCredentialsSchema }     from './totp-credentials.schema';
import { webauthnCredentialsSchema } from './webauthn-credentials.schema';
import { webauthnChallengesSchema } from './webauthn-challenges.schema';
import { mobileAuthChallengesSchema } from './mobile-auth-challenges.schema';
import { categoriesSchema } from './categories.schema';
import { productsSchema } from './products.schema';
import { catalogDocumentsSchema } from './catalog-documents.schema';
import { sectionsSchema } from './sections.schema';
import { pendingAuthenticationsSchema } from './pending-authentications.schema';
import { globalSettingsSchema } from './global-settings.schema';
import { redirectsSchema } from './redirects.schema';

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
  [COLLECTION_NAMES.RECOVERY_CODES]:      recoveryCodesSchema,
  [COLLECTION_NAMES.AUDIT_LOGS]:          auditLogsSchema,
  [COLLECTION_NAMES.LOGIN_ATTEMPTS]:      loginAttemptsSchema,
  [COLLECTION_NAMES.SYSTEM_SETTINGS]:     systemSettingsSchema,
  [COLLECTION_NAMES.PASSWORD_POLICIES]:   passwordPoliciesSchema,
  [COLLECTION_NAMES.PASSWORD_HISTORY]:    passwordHistorySchema,
  [COLLECTION_NAMES.TOTP_CREDENTIALS]:    totpCredentialsSchema,
  [COLLECTION_NAMES.WEBAUTHN_CREDENTIALS]: webauthnCredentialsSchema,
  [COLLECTION_NAMES.WEBAUTHN_CHALLENGES]: webauthnChallengesSchema,
  [COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES]: mobileAuthChallengesSchema,
  [COLLECTION_NAMES.CATEGORIES]:          categoriesSchema,
  [COLLECTION_NAMES.PRODUCTS]:            productsSchema,
  [COLLECTION_NAMES.CATALOG_DOCUMENTS]:   catalogDocumentsSchema,
  [COLLECTION_NAMES.SECTIONS]:            sectionsSchema,
  [COLLECTION_NAMES.PENDING_AUTHENTICATIONS]: pendingAuthenticationsSchema,
  [COLLECTION_NAMES.GLOBAL_SETTINGS]:     globalSettingsSchema,
  [COLLECTION_NAMES.REDIRECTS]:           redirectsSchema,
} as const;

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
  recoveryCodesSchema,
  auditLogsSchema,
  loginAttemptsSchema,
  systemSettingsSchema,
  passwordPoliciesSchema,
  passwordHistorySchema,
  totpCredentialsSchema,
  webauthnCredentialsSchema,
  webauthnChallengesSchema,
  mobileAuthChallengesSchema,
  categoriesSchema,
  productsSchema,
  catalogDocumentsSchema,
  sectionsSchema,
  pendingAuthenticationsSchema,
  globalSettingsSchema,
  redirectsSchema,
};
