import type { ObjectId } from 'mongodb';

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

  /** How many times this credential has been used (cloned-device detection). */
  counter: number;

  /** Transports supported by this credential (e.g., 'internal', 'hybrid', 'usb'). */
  transports: string[];

  /** Human-readable name given to this passkey by the user, if any. */
  name: string | null;

  /** When the user last successfully authenticated with this passkey. */
  lastUsedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}
