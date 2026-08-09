"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectsSchema = void 0;
exports.redirectsSchema = {
    bsonType: 'object',
    title: 'redirects',
    required: ['_id', 'source', 'destination', 'statusCode', 'active', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        source: { bsonType: 'string', minLength: 1, maxLength: 2000 },
        destination: { bsonType: 'string', minLength: 1, maxLength: 2000 },
        statusCode: { bsonType: 'int', enum: [301, 302] },
        active: { bsonType: 'bool' },
        reason: { bsonType: 'string', maxLength: 200 },
        notes: { bsonType: 'string', maxLength: 1000 },
        startsAt: { bsonType: ['date', 'null'] },
        endsAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
        createdBy: { bsonType: ['objectId', 'null'] },
        updatedAt: { bsonType: 'date' },
        updatedBy: { bsonType: ['objectId', 'null'] },
    },
};
