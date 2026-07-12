import type { ObjectId } from 'mongodb';

export interface UserPhoneDocument {
  readonly _id:    ObjectId;
  readonly userId: ObjectId;

  /**
   * E.164 normalized phone number — the ONLY format stored.
   * Example: "+8801712345678"
   * Do NOT store countryCode, localNumber, or formatted variants.
   */
  e164:       string;
  verified:   boolean;
  verifiedAt: Date | null;

  /**
   * Designates the main phone for this user.
   * Enforced as unique per user via partial index `uidx_userId_primary`.
   */
  primary: boolean;

  /**
   * Soft-disable: false = cannot be used for WhatsApp login.
   */
  enabled: boolean;

  readonly createdAt: Date;
  updatedAt:          Date;
}
