import type { ObjectId } from 'mongodb';

export interface PasswordPolicyDocument {
  readonly _id:         ObjectId;
  name:                 string;
  minLength:            number;
  maxLength:            number;
  requireUppercase:     boolean;
  requireLowercase:     boolean;
  requireNumber:        boolean;
  requireSpecialChar:   boolean;
  expirationDays:       number; // 0 means no expiration
  historyCount:         number;
  readonly createdAt:   Date;
  updatedAt:            Date;
}
