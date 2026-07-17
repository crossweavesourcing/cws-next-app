# Implementation Prompt 20 — Audit-Log Retention + DB Indexes

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Auth under `src/auth/`. Every login/logout/session event writes to the `audit_logs` collection via `src/auth/repositories/audit-log.repository.ts`. Schema: `src/database/schemas/audit-logs.schema.ts` (fields include `userId`, `action`, `ipAddress`, `createdAt`, `appVersion`, etc.). At "thousands of users" this grows fast with **no retention/TTL/archive strategy** and indexes may be missing, risking unbounded storage + slow queries.

Auth collections needing indexes for correctness/perf at scale:
- `refresh_tokens` — `tokenHash` (unique), `userId`, `expiresAt`, `revoked`.
- `sessions` — `userId` + `revoked` + `expiresAt`, `id` (unique lookup from cookie), `refreshTokenId`.
- `audit_logs` — `userId` + `createdAt`, `action` + `createdAt`.
- `login_attempts` — `identifier` + `createdAt`, `ipAddress` + `createdAt` (used by rate-limit service).
- `oauth_accounts` — `provider` + `providerAccountId` (unique), `userId`.
- `devices` — `userId` + `deviceTokenHash` (unique-ish), `refreshTokenId`.

DB init lives in `src/database/init.ts` (or `scripts/db-init.ts`) and index definitions in `src/database/indexes/` (verify the actual location).

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS) — MongoDB is the shared state. Limited fixed users.

## Goal

(1) Define an audit-log retention/archive strategy and implement it with a MongoDB TTL index + scheduled cleanup. (2) Ensure all auth collections have the indexes they need for correctness under concurrency and query performance.

## Implementation

1. **Indexes** — add to the appropriate init/index module (idempotent `createIndex` calls):
   - `refresh_tokens`: unique on `tokenHash`; compound `userId, expiresAt`; `expiresAt` (for sweep); `refreshTokenId`.
   - `sessions`: unique on `id` (the session id in the cookie); compound `userId, revoked, expiresAt`; `refreshTokenId`; `expiresAt`.
   - `audit_logs`: compound `userId, createdAt`; `action, createdAt`; `createdAt` (for TTL).
   - `login_attempts`: compound `identifier, createdAt`; `ipAddress, createdAt`; `expiresAt`.
   - `oauth_accounts`: unique `provider + providerAccountId`; `userId`.
   - `devices`: `userId, deviceTokenHash`; `refreshTokenId`.

2. **Retention** — add a TTL index on `audit_logs.createdAt` with `expireAfterSeconds` for a *hot* window (e.g. 180 days). If you need longer retention for compliance, instead schedule a periodic job (cron/Edge function/Platofrm scheduled function) that copies older docs to a cold collection/`audit_logs_archive` and deletes from hot, OR extend TTL and rely on backup. Keep it simple: TTL 180d hot + note backup as the archive.

3. **Cleanup sweep** — add a maintenance function (reuse `src/database/maintenance.ts` if present) that periodically deletes expired `refresh_tokens` (`expiresAt < now`) and revoked/expired `sessions`. Trigger it from a scheduled function or `instrumentation` heartbeat if available; otherwise document it as a manual/periodic job.

4. Make index creation idempotent and non-fatal on serverless cold starts (catch + log, don't crash boot).

## Acceptance criteria

1. All listed auth collections have the required indexes (verify via `db.collection.getIndexes()`).
2. `audit_logs` has a retention mechanism (TTL and/or archive job); old logs don't grow unbounded.
3. A sweep removes expired refresh tokens + sessions.
4. Index creation is idempotent and never blocks app boot.
5. No Redis; MongoDB-only.

## Notes

- TTL deletes documents automatically but does not reclaim storage instantly; a periodic `compact`/archive is optional.
- For serverless, run index creation once at deploy (build step) rather than every request.
- Keep `additionalProperties: false` schema validators in sync with new indexed fields.
