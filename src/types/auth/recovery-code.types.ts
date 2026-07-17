import type { ObjectId } from 'mongodb';

/**
 * A single backup recovery code for a user.
 *
 * Recovery codes are an out-of-band fallback when the user cannot receive the
 * email 2FA code. Each code is single-use. ONLY the SHA-256 hash (`codeHash`,
 * produced by `hashToken`) is ever persisted — the raw code is shown to the
 * user exactly once at generation time and is never stored or logged.
 */
export interface RecoveryCodeDocument {
  readonly _id: ObjectId;

  /** Owner of these recovery codes. */
  readonly userId: ObjectId;

  /** SHA-256 hex digest of the raw recovery code — NEVER store plaintext. */
  readonly codeHash: string;

  /** Whether this specific code has been consumed. */
  used: boolean;
  /** When this code was redeemed (null until used). */
  usedAt: Date | null;

  /** When the parent recovery-codes set was generated (drives TTL). */
  readonly createdAt: Date;
}
