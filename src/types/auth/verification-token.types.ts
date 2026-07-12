import type { ObjectId } from 'mongodb';
import type { VerificationTokenType } from './shared.types';

/**
 * Self-contained payload — structure varies by token type.
 *
 * email_verification:  { email: string }
 * password_reset:      { email: string }
 * email_change:        { fromEmail: string; destinationEmail: string }
 * invite:              { email: string; role: string; phone?: string }
 * magic_link:          { email: string; redirectUrl?: string }
 */
export type VerificationTokenPayload = Record<string, unknown>;

export interface VerificationTokenDocument {
  readonly _id: ObjectId;

  /**
   * null for invite tokens — user does not exist yet at issuance time.
   */
  userId: ObjectId | null;

  type: VerificationTokenType;

  /** SHA-256 hex digest of the raw token — NEVER store plaintext. */
  readonly tokenHash: string;

  /** Type-specific data. See VerificationTokenPayload JSDoc above. */
  payload: VerificationTokenPayload;

  expiresAt: Date;
  used:      boolean;
  usedAt:    Date | null;

  readonly createdAt: Date;
}
