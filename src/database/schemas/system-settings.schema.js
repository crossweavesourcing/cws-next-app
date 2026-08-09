"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemSettingsSchema = void 0;
exports.systemSettingsSchema = {
    bsonType: 'object',
    title: 'system_settings',
    required: ['_id', 'key', 'value', 'updatedBy', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        key: { bsonType: 'string', minLength: 1, maxLength: 100 },
        value: { bsonType: ['object', 'array', 'string', 'int', 'bool'] },
        updatedBy: { bsonType: ['objectId', 'null'] },
        updatedAt: { bsonType: 'date' },
    },
};
