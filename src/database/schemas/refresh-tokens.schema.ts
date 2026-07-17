import type { Document } from 'mongodb';

export const refreshTokensSchema: Document = {
  bsonType: 'object',
  title: 'refresh_tokens',
  required: [
    '_id', 'sessionId', 'userId', 'tokenHash',
    'rotationNumber', 'reuseDetected', 'revoked', 'expiresAt', 'createdAt',
  ],
  additionalProperties: false,
  properties: {
    _id:       { bsonType: 'objectId' },
    sessionId: { bsonType: 'objectId' },
    userId:    { bsonType: 'objectId' },
    tokenHash:      { bsonType: 'string', minLength: 64, maxLength: 64 },
    rotationNumber: { bsonType: 'int', minimum: 0 },
    rotatedFrom:    { bsonType: ['objectId', 'null'] },
    replacedBy:     { bsonType: ['objectId', 'null'] },
    reuseDetected:  { bsonType: 'bool' },
    revoked:        { bsonType: 'bool' },
    revokedAt:      { bsonType: ['date', 'null'] },
    revokedReason: {
      bsonType: ['string', 'null'],
      enum: ['rotated', 'logout', 'session_revoked', 'reuse_detected', 'admin', 'device_blocked', null],
    },
    lastUsedAt:        { bsonType: ['date', 'null'] },
    lastUsedIp:        { bsonType: ['string', 'null'], maxLength: 45 },
    lastUsedUserAgent: { bsonType: ['string', 'null'], maxLength: 512 },
    expiresAt:         { bsonType: 'date' },
    createdAt:         { bsonType: 'date' },
  },
};
