"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webauthnCredentialsSchema = void 0;
exports.webauthnCredentialsSchema = {
    bsonType: 'object',
    title: 'webauthn_credentials',
    required: [
        '_id',
        'userId',
        'credentialID',
        'credentialPublicKey',
        'webauthnUserID',
        'deviceObjectId',
        'counter',
        'credentialDeviceType',
        'credentialBackedUp',
        'transports',
        'name',
        'lastUsedAt',
        'createdAt',
        'updatedAt',
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        credentialID: { bsonType: 'string' },
        credentialPublicKey: { bsonType: 'string' },
        webauthnUserID: { bsonType: 'string' },
        deviceObjectId: { bsonType: ['objectId', 'null'] },
        counter: { bsonType: ['int', 'long', 'double'], minimum: 0 },
        credentialDeviceType: { bsonType: ['string', 'null'], enum: ['singleDevice', 'multiDevice', null] },
        credentialBackedUp: { bsonType: ['bool', 'null'] },
        transports: {
            bsonType: 'array',
            items: { bsonType: 'string' },
        },
        name: { bsonType: ['string', 'null'] },
        lastUsedAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
