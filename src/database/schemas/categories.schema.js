"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesSchema = void 0;
exports.categoriesSchema = {
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
        seoOverrides: {
            bsonType: 'object',
            properties: {
                title: { bsonType: 'string' },
                description: { bsonType: 'string' },
                canonicalUrl: { bsonType: 'string' },
                noindex: { bsonType: 'bool' },
                nofollow: { bsonType: 'bool' },
                includeInSitemap: { bsonType: 'bool' },
                socialTitle: { bsonType: 'string' },
                socialDescription: { bsonType: 'string' },
                socialImage: { bsonType: 'string' },
                breadcrumbLabel: { bsonType: 'string' },
                primaryTopic: { bsonType: 'string' },
                secondaryTopics: { bsonType: 'array', items: { bsonType: 'string' } },
                reviewStatus: { enum: ['draft', 'needs_review', 'approved'] },
                internalNotes: { bsonType: 'string' },
                lastReviewedAt: { bsonType: 'string' },
            },
        },
    },
};
