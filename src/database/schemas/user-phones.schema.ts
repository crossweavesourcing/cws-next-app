import type { Document } from 'mongodb';

export const userPhonesSchema: Document = {
  bsonType: 'object',
  title: 'user_phones',
  required: ['_id', 'userId', 'e164', 'verified', 'primary', 'enabled', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id:    { bsonType: 'objectId' },
    userId: { bsonType: 'objectId' },
    e164: {
      bsonType: 'string',
      pattern: '^\\+[1-9]\\d{6,14}$',
    },
    verified:   { bsonType: 'bool' },
    verifiedAt: { bsonType: ['date', 'null'] },
    primary:    { bsonType: 'bool' },
    enabled:    { bsonType: 'bool' },
    createdAt:  { bsonType: 'date' },
    updatedAt:  { bsonType: 'date' },
  },
};
