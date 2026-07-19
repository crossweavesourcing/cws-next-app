import type { Document } from 'mongodb';

export const categoriesSchema: Document = {
  bsonType: 'object',
  required: ['name', 'slug', 'description', 'image', 'visible', 'createdAt', 'updatedAt'],
  properties: {
    name: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    slug: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    description: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    image: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    visible: {
      bsonType: 'bool',
      description: 'must be a boolean and is required',
    },
    createdAt: {
      bsonType: 'date',
      description: 'must be a date and is required',
    },
    updatedAt: {
      bsonType: 'date',
      description: 'must be a date and is required',
    },
  },
};
