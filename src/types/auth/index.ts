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

export type { RefreshTokenDocument }       from './refresh-token.types';
export type {
  VerificationTokenPayload,
  VerificationTokenDocument,
} from './verification-token.types';
export type { OtpCodeDocument }            from './otp-code.types';
export type {
  ActorType,
  AuditActor,
  AuditSource,
  AuditResource,
  AuditLogDocument,
} from './audit-log.types';
export type { LoginAttemptDocument }       from './login-attempt.types';
