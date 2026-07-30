import type { ObjectId } from 'mongodb';
import type { CredentialDeviceType } from '@simplewebauthn/server';

// ─────────────────────────────────────────────────────────────────────────────
// TOTP (Time-based One-Time Password) Credentials
// ─────────────────────────────────────────────────────────────────────────────

export interface TOTPCredentialDocument {
  readonly _id: ObjectId;
  userId: ObjectId;
  
  /**
   * The encrypted or plaintext base32 TOTP secret.
   * In a high-security environment, this should ideally be encrypted with a KMS key
   * before storing, but for this implementation we store the raw base32 secret.
   */
  secret: string;

  /** When the user successfully verified the first code. */
  verifiedAt: Date;
  /** Last accepted TOTP time step. Used to reject replay within a valid window. */
  lastAcceptedTimeStep: number | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebAuthn / Passkey Credentials
// ─────────────────────────────────────────────────────────────────────────────

export interface WebAuthnCredentialDocument {
  readonly _id: ObjectId;
  userId: ObjectId;

  /** Base64URL-encoded credential ID from the authenticator. */
  credentialID: string;

  /** Base64URL-encoded public key bytes. */
  credentialPublicKey: string;

  /** Stable WebAuthn user handle used for discoverable credentials. */
  webauthnUserID: string;

  /** Server-issued device record this passkey was registered from. */
  deviceObjectId: ObjectId | null;

  /** How many times this credential has been used (cloned-device detection). */
  counter: number;

  /** Whether this is a synced multi-device passkey or single-device authenticator. */
  credentialDeviceType: CredentialDeviceType | null;

  /** Whether the authenticator reported the credential as backed up. */
  credentialBackedUp: boolean | null;

  /** Transports supported by this credential (e.g., 'internal', 'hybrid', 'usb'). */
  transports: string[];

  /** Human-readable name given to this passkey by the user, if any. */
  name: string | null;

  /** When the user last successfully authenticated with this passkey. */
  lastUsedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

export type WebAuthnChallengePurpose =
  | 'registration'
  | 'mfa'
  | 'passwordless_login'
  | 'mobile_registration'
  | 'mobile_mfa'
  | 'mobile_passwordless_login';

export interface WebAuthnChallengeDocument {
  readonly _id: ObjectId;
  challenge: string;
  purpose: WebAuthnChallengePurpose;
  userId: ObjectId | null;
  tokenHash: string | null;
  deviceObjectId: ObjectId | null;
  platform: 'web' | 'mobile';
  ipAddress: string | null;
  userAgent: string | null;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}
