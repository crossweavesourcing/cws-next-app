"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sectionsSchema = void 0;
exports.sectionsSchema = {
    bsonType: 'object',
    required: ['sectionId', 'pageKey', 'label', 'route', 'status', 'paused', 'summary'],
    properties: {
        _id: { bsonType: 'objectId' },
        sectionId: { bsonType: 'string' },
        pageKey: { bsonType: 'string' },
        label: { bsonType: 'string' },
        route: { bsonType: 'string' },
        status: { bsonType: 'string', enum: ['Live', 'Review', 'Draft'] },
        paused: { bsonType: 'bool' },
        summary: { bsonType: 'string' },
        mediaUrl: { bsonType: 'string' },
        content: {
            bsonType: 'object',
            additionalProperties: {
                anyOf: [
                    { bsonType: 'string' },
                    { bsonType: 'array', items: { bsonType: 'string' } },
                ],
            },
        },
        media: {
            bsonType: 'object',
            additionalProperties: {
                bsonType: 'object',
                required: ['url', 'kind', 'isDefault'],
                properties: {
                    url: { bsonType: 'string' },
                    kind: { bsonType: 'string', enum: ['image', 'video'] },
                    publicId: { bsonType: 'string' },
                    isDefault: { bsonType: 'bool' },
                },
            },
        },
        lastEdited: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
