"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogsIndexes = void 0;
exports.auditLogsIndexes = [
    // 1. User audit history, newest first.
    //    Sparse because userId is null for anonymous events.
    {
        key: { userId: 1, createdAt: -1 },
        sparse: true,
        name: 'idx_userId_createdAt',
    },
    // 2. Security alerting + retention queries: find events of a type (incl.
    //    FAILURE) in a time window. (action, status, createdAt) is a strict
    //    superset of the requested (action, createdAt) — the leading (action,
    //    status) prefix already bounds the action scan, and createdAt keeps the
    //    range bounded. Kept as-is (existing index) so no stale index is left
    //    behind; a separate (action, createdAt)-only index would be redundant.
    {
        key: { action: 1, status: 1, createdAt: -1 },
        name: 'idx_action_status_createdAt',
    },
    // 3. TTL — 180-day hot retention window (was 90d).
    //    Old logs are archived to audit_logs_archive by the nightly maintenance
    //    job BEFORE this TTL deletes them, so compliance retention is preserved in
    //    cold storage while the hot collection stays bounded. Update via collMod;
    //    reduce only after archival is confirmed.
    {
        key: { createdAt: 1 },
        expireAfterSeconds: 15552000, // 180 days
        name: 'ttl_createdAt',
    },
];
