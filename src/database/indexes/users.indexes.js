"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersIndexes = void 0;
/** users collection indexes. */
exports.usersIndexes = [
    // TTL index to automatically remove soft-deleted users after 30 days (2592000 seconds)
    {
        key: { deletedAt: 1 },
        expireAfterSeconds: 2592000,
        name: 'idx_deletedAt_ttl',
    },
];
