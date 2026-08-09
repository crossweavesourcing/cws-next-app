"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicesIndexes = void 0;
exports.devicesIndexes = [
    // 1. Global uniqueness on client-generated device UUID; primary registration lookup.
    {
        key: { deviceId: 1 },
        unique: true,
        name: 'uidx_deviceId',
    },
    // 2. List all registered devices for a user, newest first (device management UI).
    {
        key: { userId: 1, createdAt: -1 },
        name: 'idx_userId_createdAt',
    },
    // 3. Fetch trusted devices for a user (reduced-friction auth flow).
    //    Partial index keeps it selective — only indexes trusted: true documents.
    {
        key: { userId: 1, trusted: 1 },
        partialFilterExpression: { trusted: true },
        name: 'idx_userId_trusted',
    },
    // 4. Check if a device is blocked before allowing session creation.
    {
        key: { userId: 1, blocked: 1 },
        partialFilterExpression: { blocked: true },
        name: 'idx_userId_blocked',
    },
];
