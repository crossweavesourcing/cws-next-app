import type { Document } from 'mongodb';

export const passwordPoliciesSchema: Document = {
  bsonType: 'object',
  title: 'password_policies',
  required: ['_id', 'name', 'minLength', 'maxLength', 'requireUppercase', 'requireLowercase', 'requireNumber', 'requireSpecialChar', 'expirationDays', 'historyCount', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id:                { bsonType: 'objectId' },
    name:               { bsonType: 'string', minLength: 1, maxLength: 100 },
    minLength:          { bsonType: 'int', minimum: 8 },
    maxLength:          { bsonType: 'int', maximum: 128 },
    requireUppercase:   { bsonType: 'bool' },
    requireLowercase:   { bsonType: 'bool' },
    requireNumber:      { bsonType: 'bool' },
    requireSpecialChar: { bsonType: 'bool' },
    expirationDays:     { bsonType: 'int', minimum: 0, description: '0 means no expiration' },
    historyCount:       { bsonType: 'int', minimum: 0, description: 'Number of old passwords to remember' },
    createdAt:          { bsonType: 'date' },
    updatedAt:          { bsonType: 'date' },
  },
};
