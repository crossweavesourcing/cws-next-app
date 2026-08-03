import type { Document } from 'mongodb';

export const redirectsSchema: Document = {
  bsonType: 'object',
  title: 'redirects',
  required: ['_id', 'source', 'destination', 'statusCode', 'active', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    source: { bsonType: 'string', minLength: 1, maxLength: 2000 },
    destination: { bsonType: 'string', minLength: 1, maxLength: 2000 },
    statusCode: { bsonType: 'int', enum: [301, 302, 307, 308] },
    active: { bsonType: 'bool' },
    createdAt: { bsonType: 'date' },
    createdBy: { bsonType: ['objectId', 'null'] },
    updatedAt: { bsonType: 'date' },
    updatedBy: { bsonType: ['objectId', 'null'] },
  },
};
