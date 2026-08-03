import type { Document } from 'mongodb';

export const productsSchema: Document = {
  bsonType: 'object',
  required: [
    'slug',
    'name',
    'shortDescription',
    'overview',
    'image',
    'imageAltText',
    'images',
    'imagesAltText',
    'manufacturing',
    'specifications',
    'features',
    'visible',
    'createdAt',
    'updatedAt'
  ],
  properties: {
    categoryId: {
      bsonType: ['objectId', 'null'],
      description: 'must be an objectId or null',
    },
    slug: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    name: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    shortDescription: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    overview: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    image: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    imageAltText: {
      bsonType: 'string',
      description: 'must be a string and is required',
    },
    images: {
      bsonType: 'array',
      items: {
        bsonType: 'string',
      },
      description: 'must be an array of strings and is required',
    },
    imagesAltText: {
      bsonType: 'array',
      items: {
        bsonType: 'string',
      },
      description: 'must be an array of strings and is required',
    },
    manufacturing: {
      bsonType: 'array',
      items: {
        bsonType: 'string',
      },
      description: 'must be an array of strings and is required',
    },
    specifications: {
      bsonType: 'object',
      required: ['material', 'productionFocus', 'finishing', 'quality'],
      properties: {
        material: { bsonType: 'string' },
        productionFocus: { bsonType: 'string' },
        finishing: { bsonType: 'string' },
        quality: { bsonType: 'string' },
      },
      description: 'must be an object and is required',
    },
    features: {
      bsonType: 'array',
      items: {
        bsonType: 'string',
      },
      description: 'must be an array of strings and is required',
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
    longDescription: { bsonType: 'string' },
    materials: { bsonType: 'string' },
    process: { bsonType: 'string' },
    qualityControl: { bsonType: 'string' },
    customization: { bsonType: 'string' },
    applications: { bsonType: 'string' },
    packaging: { bsonType: 'string' },
    faqs: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        required: ['question', 'answer'],
        properties: {
          question: { bsonType: 'string' },
          answer: { bsonType: 'string' }
        }
      }
    },
    relatedProducts: {
      bsonType: 'array',
      items: {
        bsonType: 'objectId'
      }
    },
    seoOverrides: {
      bsonType: 'object',
      properties: {
        title: { bsonType: 'string' },
        description: { bsonType: 'string' },
        canonicalUrl: { bsonType: 'string' },
        noindex: { bsonType: 'bool' }
      }
    }
  },
};
