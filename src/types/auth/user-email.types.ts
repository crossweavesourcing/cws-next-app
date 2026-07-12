import type { ObjectId } from 'mongodb';

export interface UserEmailDocument {
  readonly _id:    ObjectId;
  readonly userId: ObjectId;

  /** Lowercase-normalized email address. */
  email:      string;
  verified:   boolean;
  verifiedAt: Date | null;

  /**
   * Designates the main contact email for this user.
   * Enforced as unique per user via partial index `uidx_userId_primary`.
   */
  primary: boolean;

  /**
   * Soft-disable: false = cannot be used to log in, but record is retained.
   * Allows disabling a login method without losing historical data.
   */
  enabled: boolean;

  readonly createdAt: Date;
  updatedAt:          Date;
}
