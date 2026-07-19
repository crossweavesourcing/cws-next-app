import type { Document } from 'mongodb';

export const mobileAuthChallengesSchema: Document = {
  bsonType: 'object',
  title: 'mobile_auth_challenges',
  required: ['_id', 'tokenHash', 'userId', 'loginMethod', 'methods', 'attempts', 'maxAttempts', 'expiresAt', 'usedAt', 'ipAddress', 'createdAt'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    tokenHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
    userId: { bsonType: 'objectId' },
    loginMethod: { bsonType: 'string', enum: ['password', 'google'] },
    methods: { bsonType: 'array', minItems: 1, items: { bsonType: 'string', enum: ['totp', 'email', 'webauthn'] } },
    attempts: { bsonType: 'int', minimum: 0 },
    maxAttempts: { bsonType: 'int', minimum: 1 },
    expiresAt: { bsonType: 'date' },
    usedAt: { bsonType: ['date', 'null'] },
    ipAddress: { bsonType: 'string', maxLength: 45 },
    userAgent: { bsonType: ['string', 'null'], maxLength: 512 },
    webauthnChallenge: { bsonType: 'string', maxLength: 512 },
    createdAt: { bsonType: 'date' },
  },
};
