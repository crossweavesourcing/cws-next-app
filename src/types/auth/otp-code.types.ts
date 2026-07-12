import type { ObjectId } from 'mongodb';
import type { OtpType } from './shared.types';

export interface OtpCodeDocument {
  readonly _id: ObjectId;

  /**
   * null if user is not yet resolved at OTP issuance (pre-link phone).
   */
  userId: ObjectId | null;

  /** E.164 phone number that owns this OTP. */
  e164: string;

  /** SHA-256 hex digest — NEVER store the OTP plaintext. */
  readonly otpHash: string;

  type: OtpType;

  /** Number of verification attempts made against this OTP. */
  attempts:    number;
  /** Maximum allowed attempts before this OTP is invalidated. Typically 3–5. */
  maxAttempts: number;

  consumed:   boolean;
  consumedAt: Date | null;

  expiresAt:          Date;
  readonly createdAt: Date;
}
