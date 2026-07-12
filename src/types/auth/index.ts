// ─────────────────────────────────────────────────────────────────────────────
// Public API: src/types/auth/
// Re-exports every auth collection document type and shared types.
// Import from here: import type { UserDocument, SessionDocument } from '@/types/auth'
// ─────────────────────────────────────────────────────────────────────────────

export type {
  UserRole,
  UserStatus,
  LoginMethod,
  OAuthProvider,
  Platform,
  AuditStatus,
  IdentifierType,
  VerificationTokenType,
  OtpType,
  RevokedBy,
  RevokedReason,
  HashAlgorithm,
  DeviceType,
  TrustGrantedBy,
  AvatarSource,
  BlockedBy,
} from './shared.types';

export type {
  UserAvatar,
  UserProfile,
  UserPassword,
  UserSecurity,
  UserMetadata,
  UserDocument,
} from './user.types';

export type { UserEmailDocument }          from './user-email.types';
export type { UserPhoneDocument }          from './user-phone.types';
export type { OAuthAccountDocument }       from './oauth-account.types';

export type {
  DeviceFingerprint,
  DeviceLocation,
  DeviceDocument,
} from './device.types';

export type {
  SessionLocation,
  SessionDocument,
} from './session.types';

export * from './refresh-token.types';
export * from './verification-token.types';
export * from './otp-code.types';
export * from './audit-log.types';
export * from './login-attempt.types';
export * from './role.types';
export * from './permission.types';
export * from './system-setting.types';
export * from './password-policy.types';
export * from './password-history.types';
