"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSettingsSchema = void 0;
exports.globalSettingsSchema = {
    bsonType: 'object',
    title: 'global_settings',
    required: ['_id', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        brandName: { bsonType: 'string', minLength: 1, maxLength: 200 },
        defaultSocialImage: { bsonType: 'string', minLength: 1, maxLength: 1000 },
        organizationName: { bsonType: 'string', minLength: 1, maxLength: 200 },
        organizationLegalName: { bsonType: 'string', minLength: 1, maxLength: 200 },
        organizationUrl: { bsonType: 'string', minLength: 1, maxLength: 1000 },
        organizationLogo: { bsonType: 'string', minLength: 1, maxLength: 1000 },
        contactEmail: { bsonType: 'string', minLength: 1, maxLength: 254 },
        contactPhone: { bsonType: 'string', minLength: 1, maxLength: 50 },
        contactAddress: { bsonType: 'string', minLength: 1, maxLength: 1000 },
        socialLinks: { bsonType: 'array', items: { bsonType: 'string', minLength: 1, maxLength: 1000 }, maxItems: 20 },
        defaultSeoTitle: { bsonType: 'string', minLength: 1, maxLength: 200 },
        defaultSeoDescription: { bsonType: 'string', minLength: 1, maxLength: 500 },
        siteName: { bsonType: 'string', minLength: 1, maxLength: 200 },
        googleSiteVerification: { bsonType: 'string', minLength: 1, maxLength: 100 },
        bingSiteVerification: { bsonType: 'string', minLength: 1, maxLength: 100 },
        gtmId: { bsonType: 'string', minLength: 1, maxLength: 50 },
        updatedAt: { bsonType: 'date' },
        updatedBy: { bsonType: ['objectId', 'null'] },
    },
};
