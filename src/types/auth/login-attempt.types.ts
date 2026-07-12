import type { ObjectId } from 'mongodb';
import type { IdentifierType } from './shared.types';

export interface LoginAttemptDocument {
  readonly _id: ObjectId;

  /**
   * null if the identifier did not resolve to a known user.
   * (e.g. attempt with unknown email address)
   */
  userId: ObjectId | null;

  identifierType: IdentifierType;

  /**
   * Normalized identifier presented at login.
   * Values: lowercase email, E.164 phone, or OAuth subject ID.
   * NEVER store a password or token in this field.
   */
  identifier: string;

  ipAddress: string;
  userAgent: string | null;
  device:    string | null;

  success:       boolean;
  failureReason: string | null;

  /**
   * When set, this attempt triggered a lockout.
   * lockExpiresAt = when the lockout expires.
   *
   * Allows the rate-limiter to make allow/reject decisions by querying
   * login_attempts alone, without cross-collection reads to users.security.
   */
  lockExpiresAt: Date | null;

  /** Ties this attempt to a wider request trace (e.g. from auth service logs). */
  correlationId: string | null;

  country:   string | null;
  city:      string | null;

  readonly createdAt: Date;
}
