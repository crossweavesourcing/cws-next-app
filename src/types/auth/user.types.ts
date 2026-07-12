import type { ObjectId } from 'mongodb';
import type { UserRole, UserStatus, LoginMethod, HashAlgorithm, AvatarSource } from './shared.types';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured avatar — not a plain URL string.
 * Tracks source for lazy provider sync and originalUrl for staleness detection.
 */
export interface UserAvatar {
  /** Final serving URL (CDN or provider URL). */
  url:         string | null;
  /** Where the avatar came from. */
  source:      AvatarSource | null;
  /** Raw provider URL — may expire for OAuth sources. */
  originalUrl: string | null;
  /** Last time avatar was refreshed. Used for staleness detection. */
  updatedAt:   Date | null;
}

export interface UserProfile {
  displayName: string;
  firstName:   string | null;
  lastName:    string | null;
  /**
   * Structured avatar object.
   * @see UserAvatar
   */
  avatar:      UserAvatar | null;
  /** IANA timezone string, e.g. "Asia/Dhaka" */
  timezone:    string | null;
  /** BCP 47 locale tag, e.g. "en-US" */
  locale:      string | null;
  employeeId:  string | null;
  department:  string | null;
}

export interface UserPassword {
  /** Argon2id / bcrypt hash — NEVER plaintext. */
  hash:      string;
  /** Stored to enable zero-downtime migration from bcrypt → argon2id. */
  algorithm: HashAlgorithm;
}

export interface UserSecurity {
  failedLoginAttempts:       number;
  /** null = not locked. */
  lockedUntil:               Date | null;
  mfaEnabled:                boolean;
  lastPasswordResetRequestAt: Date | null;
  forcePasswordChange:       boolean;
  accountSecurityVersion:    number;
}

export interface UserMetadata {
  /** userId of the admin who created this account. */
  invitedBy:  ObjectId | null;
  invitedAt:  Date | null;
  /** Internal admin notes — never shown to the user. */
  notes:      string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────────

export interface UserDocument {
  readonly _id: ObjectId;

  profile:  UserProfile;

  /**
   * Nullable — absent for OAuth-only / WhatsApp-only users.
   * `password.algorithm` enables zero-downtime hash migration.
   */
  password: UserPassword | null;

  /** Timestamp of last password change — used to invalidate pre-change sessions. */
  passwordChangedAt: Date | null;
  passwordExpiresAt: Date | null;

  role:   UserRole;
  roleId: ObjectId | null;
  status: UserStatus;

  /**
   * Derived capability flags — NOT the authoritative source.
   * Authoritative state lives in user_emails, user_phones, oauth_accounts.
   * Updated by application after changes to those collections.
   */
  loginMethods: LoginMethod[];

  security: UserSecurity;
  metadata: UserMetadata;

  readonly createdAt: Date;
  updatedAt:          Date;
  deletedAt:          Date | null;
}
