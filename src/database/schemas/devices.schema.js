"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicesSchema = void 0;
/**
 * $jsonSchema for the `devices` collection.
 * Fingerprint hashes are always 64-char SHA-256 hex digests when present.
 * Raw canvas/font data is NEVER stored.
 */
exports.devicesSchema = {
    bsonType: 'object',
    title: 'devices',
    required: [
        '_id', 'userId', 'deviceId', 'type',
        'trusted', 'blocked', 'loginCount',
        'lastSeenAt', 'firstSeenAt', 'createdAt', 'updatedAt',
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        deviceId: { bsonType: 'string', minLength: 36, maxLength: 36 },
        name: { bsonType: ['string', 'null'], maxLength: 120 },
        type: { bsonType: 'string', enum: ['desktop', 'mobile', 'tablet', 'unknown'] },
        platform: { bsonType: ['string', 'null'], enum: ['web', 'mobile', 'desktop', null] },
        browser: { bsonType: ['string', 'null'], maxLength: 100 },
        operatingSystem: { bsonType: ['string', 'null'], maxLength: 100 },
        userAgent: { bsonType: ['string', 'null'], maxLength: 512 },
        fingerprint: {
            bsonType: ['object', 'null'],
            additionalProperties: false,
            properties: {
                screenResolution: { bsonType: ['string', 'null'], maxLength: 20 },
                colorDepth: { bsonType: ['int', 'null'] },
                pixelRatio: { bsonType: ['double', 'null'] },
                hardwareConcurrency: { bsonType: ['int', 'null'] },
                deviceMemory: { bsonType: ['double', 'null'] },
                maxTouchPoints: { bsonType: ['int', 'null'] },
                touchSupport: { bsonType: ['bool', 'null'] },
                timezone: { bsonType: ['string', 'null'], maxLength: 64 },
                language: { bsonType: ['string', 'null'], maxLength: 20 },
                languages: { bsonType: ['string', 'null'], maxLength: 100 },
                cookiesEnabled: { bsonType: ['bool', 'null'] },
                doNotTrack: { bsonType: ['string', 'null'], maxLength: 12 },
                platform: { bsonType: ['string', 'null'], maxLength: 100 },
                // SHA-256 hex digests — exactly 64 chars when present
                canvasHash: { bsonType: ['string', 'null'], minLength: 64, maxLength: 64 },
                webglHash: { bsonType: ['string', 'null'], minLength: 64, maxLength: 64 },
                audioHash: { bsonType: ['string', 'null'], minLength: 64, maxLength: 64 },
                fontsHash: { bsonType: ['string', 'null'], minLength: 64, maxLength: 64 },
                stabilityScore: { bsonType: ['double', 'null'], minimum: 0, maximum: 1 },
            },
        },
        trusted: { bsonType: 'bool' },
        trustedAt: { bsonType: ['date', 'null'] },
        trustedUntil: { bsonType: ['date', 'null'] },
        trustGrantedBy: { bsonType: ['string', 'null'], enum: ['user', 'admin', null] },
        blocked: { bsonType: 'bool' },
        blockedAt: { bsonType: ['date', 'null'] },
        blockedBy: { bsonType: ['string', 'null'], enum: ['user', 'admin', null] },
        blockedReason: { bsonType: ['string', 'null'], maxLength: 500 },
        loginCount: { bsonType: 'int', minimum: 0 },
        lastSeenAt: { bsonType: 'date' },
        lastSeenIp: { bsonType: ['string', 'null'], maxLength: 45 },
        lastSeenLocation: {
            bsonType: ['object', 'null'],
            additionalProperties: false,
            properties: {
                country: { bsonType: ['string', 'null'], maxLength: 80 },
                region: { bsonType: ['string', 'null'], maxLength: 120 },
                city: { bsonType: ['string', 'null'], maxLength: 120 },
            },
        },
        firstSeenAt: { bsonType: 'date' },
        firstSeenIp: { bsonType: ['string', 'null'], maxLength: 45 },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
