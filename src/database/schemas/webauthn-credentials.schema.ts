import type { Document } from 'mongodb';

export const webauthnCredentialsSchema: Document = {
  bsonType: 'object',
  title: 'webauthn_credentials',
  required: [
    '_id',
    'userId',
    'credentialID',
    'credentialPublicKey',
    'counter',
    'transports',
    'name',
    'lastUsedAt',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
  properties: {
    _id:                 { bsonType: 'objectId' },
    userId:              { bsonType: 'objectId' },
    credentialID:        { bsonType: 'string' },
    credentialPublicKey: { bsonType: 'string' },
    counter:             { bsonType: 'int' },
    transports: {
      bsonType: 'array',
      items: { bsonType: 'string' },
    },
    name:                { bsonType: ['string', 'null'] },
    lastUsedAt:          { bsonType: ['date', 'null'] },
    createdAt:           { bsonType: 'date' },
    updatedAt:           { bsonType: 'date' },
  },
};
