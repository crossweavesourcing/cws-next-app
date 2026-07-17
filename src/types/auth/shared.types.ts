// ─────────────────────────────────────────────────────────────────────────────
// Shared enums and union types used across all auth collections.
// CollectionName is intentionally NOT defined here — it lives in
// src/database/constants.ts and is derived from COLLECTION_NAMES.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member' | 'viewer';

export type UserStatus = 
  | 'active' 
  | 'inactive' 
  | 'suspended' 
  | 'locked' 
  | 'disabled' 
  | 'pending_password_reset' 
  | 'password_expired' 
  | 'force_password_change' 
  | 'deleted' 
  | 'pending_invite';

export type LoginMethod = 'password' | 'google' | 'linkedin' | 'whatsapp';

export type OAuthProvider = 'google' | 'linkedin';

export type Platform = 'web' | 'mobile' | 'desktop';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING';

export type IdentifierType =
  | 'EMAIL'
  | 'PHONE'
  | 'GOOGLE'
  | 'LINKEDIN'
  | 'WHATSAPP'
  | 'PASSWORD_RESET_REQUEST'; // FIX-07: distinguish reset *requests* from failures

export type VerificationTokenType =
  | 'email_verification'
  | 'password_reset'
  | 'email_change'
  | 'invite'
  | 'magic_link'
  | 'two_factor';

export type OtpType = 'whatsapp_login' | 'phone_verification';

export type RevokedBy = 'user' | 'admin' | 'system';

export type RevokedReason =
  | 'rotated'
  | 'logout'
  | 'session_revoked'
  | 'reuse_detected'
  | 'admin'
  | 'device_blocked' // FIX-13: refresh tokens revoked because their device was blocked
  | 'step_up_pending' // Item 9: session/token revoked pending email 2FA step-up
  | 'theft_detected';

export type HashAlgorithm = 'argon2id' | 'bcrypt';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type TrustGrantedBy = 'user' | 'admin';

/** Source of a user's avatar image. */
export type AvatarSource = 'upload' | 'google' | 'linkedin' | 'gravatar';

/** Who blocked a device. */
export type BlockedBy = 'user' | 'admin';
