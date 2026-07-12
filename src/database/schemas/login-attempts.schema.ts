import type { Document } from 'mongodb';

export const loginAttemptsSchema: Document = {
  bsonType: 'object',
  title: 'login_attempts',
  required: ['_id', 'identifierType', 'identifier', 'ipAddress', 'success', 'createdAt'],
  additionalProperties: false,
  properties: {
    _id:    { bsonType: 'objectId' },
    userId: { bsonType: ['objectId', 'null'] },
    identifierType: {
      bsonType: 'string',
      enum: ['EMAIL', 'PHONE', 'GOOGLE', 'LINKEDIN', 'WHATSAPP'],
    },
    identifier:    { bsonType: 'string', minLength: 1, maxLength: 254 },
    ipAddress:     { bsonType: 'string', maxLength: 45 },
    userAgent:     { bsonType: ['string', 'null'], maxLength: 512 },
    device:        { bsonType: ['string', 'null'], maxLength: 200 },
    success:       { bsonType: 'bool' },
    failureReason: { bsonType: ['string', 'null'], maxLength: 200 },
    lockExpiresAt: {
      bsonType: ['date', 'null'],
      description:
        'When set, this attempt triggered a lockout expiring at this timestamp. ' +
        'Allows rate-limit decisions without cross-collection reads.',
    },
    correlationId: { bsonType: ['string', 'null'], maxLength: 128 },
    country:       { bsonType: ['string', 'null'], maxLength: 80 },
    city:          { bsonType: ['string', 'null'], maxLength: 120 },
    createdAt:     { bsonType: 'date' },
  },
};
