import type { ObjectId } from 'mongodb';
import type { RevokedReason } from './shared.types';

export interface RefreshTokenDocument {
  readonly _id:       ObjectId;
  readonly sessionId: ObjectId;
  /**
   * Denormalized from sessions.userId.
   * Enables single-collection revocation of all tokens for a user
   * across all sessions (account compromise response).
   */
  readonly userId: ObjectId;

  // ── Immutable fields — set at creation, never changed ────────────────────
  /** SHA-256 hex digest — NEVER store the plaintext token value. */
  readonly tokenHash:      string;
  /** Increments with each rotation starting at 0. */
  readonly rotationNumber: number;
  /** _id of the token this one replaced. null for first token in a session. */
  readonly rotatedFrom:    ObjectId | null;

  // ── Mutable revocation fields ─────────────────────────────────────────────
  /** _id of the token that replaced this one (set during rotation). */
  replacedBy:    ObjectId | null;
  /**
   * true when a revoked token is presented again.
   * Signal of potential token theft — trigger full session revocation.
   */
  reuseDetected: boolean;
  revoked:       boolean;
  revokedAt:     Date | null;
  revokedReason: RevokedReason | null;

  // ── Usage tracking ────────────────────────────────────────────────────────
  lastUsedAt:        Date | null;
  /** Client IP at last use — string, NOT a Date (latent bug fixed during rotation work). */
  lastUsedIp:        string | null;
  lastUsedUserAgent: string | null;

  expiresAt:          Date;
  readonly createdAt: Date;
}
