"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthAccountsIndexes = void 0;
exports.oauthAccountsIndexes = [
    // 1. Core lookup on OAuth callback; prevents double-linking the same provider account.
    {
        key: { provider: 1, providerAccountId: 1 },
        unique: true,
        name: 'uidx_provider_accountId',
    },
    // 2. Fetch all connected OAuth providers for a user.
    {
        key: { userId: 1 },
        name: 'idx_userId',
    },
];
