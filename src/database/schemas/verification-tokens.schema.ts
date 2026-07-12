import type { Document } from 'mongodb';

export const verificationTokensSchema: Document = {
  bsonType: 'object',
  title: 'verification_tokens',
  required: ['_id', 'type', 'tokenHash', 'payload', 'expiresAt', 'used', 'createdAt'],
  additionalProperties: false,
  properties: {
    _id:    { bsonType: 'objectId' },
    userId: { bsonType: ['objectId', 'null'] },
    type: {
      bsonType: 'string',
      enum: ['email_verification', 'password_reset', 'email_change', 'invite', 'magic_link'],
    },
    tokenHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
    payload:   { bsonType: 'object', additionalProperties: true },
    expiresAt: { bsonType: 'date' },
    used:      { bsonType: 'bool' },
    usedAt:    { bsonType: ['date', 'null'] },
    createdAt: { bsonType: 'date' },
  },
};
