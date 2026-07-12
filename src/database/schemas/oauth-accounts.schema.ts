import type { Document } from 'mongodb';

export const oauthAccountsSchema: Document = {
  bsonType: 'object',
  title: 'oauth_accounts',
  required: ['_id', 'userId', 'provider', 'providerAccountId', 'linkedAt'],
  additionalProperties: false,
  properties: {
    _id:    { bsonType: 'objectId' },
    userId: { bsonType: 'objectId' },
    provider: {
      bsonType: 'string',
      enum: ['google', 'linkedin'],
    },
    providerAccountId: { bsonType: 'string', minLength: 1, maxLength: 256 },
    providerEmail:     { bsonType: ['string', 'null'], maxLength: 254 },
    profile:           { bsonType: ['object', 'null'], additionalProperties: true },
    linkedAt:          { bsonType: 'date' },
    lastUsedAt:        { bsonType: ['date', 'null'] },
  },
};
