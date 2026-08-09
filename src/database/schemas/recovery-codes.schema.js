"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoveryCodesSchema = void 0;
exports.recoveryCodesSchema = {
    bsonType: 'object',
    title: 'recovery_codes',
    required: ['_id', 'userId', 'codeHash', 'used', 'usedAt', 'createdAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        // SHA-256 hex digest (64 chars). One doc per code; uniqueness enforced by index.
        codeHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
        used: { bsonType: 'bool' },
        usedAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
    },
};
