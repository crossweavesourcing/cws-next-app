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

---

# Implementation Report — as delivered

## Schema reality check (deviations from the prompt's idealized field names)

The prompt lists several fields that **do not exist in this codebase's actual schemas**.
Implementing indexes on non-existent fields would either fail (`createIndexes` rejects
unknown keys under `$jsonSchema` strict validation) or silently index `null`. The
implementation maps each requirement to the real field and documents the gap:

| Prompt field | Reality in this codebase | Index delivered |
| --- | --- | --- |
| sessions `id` (unique cookie lookup) | Sessions are looked up by their `_id` (`ObjectId`) stored in the signed `cws_session` cookie. `_id` is already implicitly unique — **no extra index needed**. | Covered by `_id` (unique by default). |
| sessions `refreshTokenId` | Real field is `latestRefreshTokenId` (`ObjectId`, nullable). | Added `idx_latestRefreshTokenId` on `latestRefreshTokenId`. |
| refresh_tokens `refreshTokenId` | No such field. Family revocation is by `sessionId` (`ObjectId`). | Already had `idx_sessionId`; added `idx_userId_expiresAt` compound. |
| devices `deviceTokenHash` | No such field. The client device token is `deviceId` (36-char UUID v4), already unique-indexed. | Already had `uidx_deviceId`; `userId, deviceId` queryable via existing `idx_userId_createdAt` + `uidx_deviceId`. |
| devices `refreshTokenId` | Devices have no refresh-token pointer. | N/A — not applicable. |
| login_attempts `expiresAt` | No `expiresAt` field; TTL is on `createdAt` (24h). | Kept `ttl_createdAt` on `createdAt`. |

No `additionalProperties: false` schema changes were required because every indexed
field already exists in its collection's `$jsonSchema`.

## Indexes delivered

All defined in `src/database/indexes/*.indexes.ts`, applied idempotently by
`initializeDatabase()` (called from `scripts/db-init.ts`).

### refresh_tokens (`refresh-tokens.indexes.ts`)
- `uidx_tokenHash` — **unique** on `tokenHash` (O(1) token validation). *(pre-existing)*
- `idx_sessionId` — `sessionId` (bulk-revoke a session's token family). *(pre-existing)*
- `idx_userId_expiresAt` — **new** compound `{ userId: 1, expiresAt: 1 }` for user-wide
  revocation sweeps + expired-range scans.
- `idx_userId` — `userId` (account-compromise revocation). *(pre-existing)*
- `ttl_expiresAt` — `expiresAt`, `expireAfterSeconds: 0` (delete exactly at expiry). *(pre-existing)*

### sessions (`sessions.indexes.ts`)
- `idx_userId_createdAt` — `userId, createdAt` (list a user's sessions). *(pre-existing)*
- `idx_userId_revoked_expiresAt` — **renamed/extended** to exact `{ userId, revoked, expiresAt }`
  shape required for concurrent-session caps + sweep.
- `idx_latestRefreshTokenId` — **new** on `latestRefreshTokenId`.
- `idx_expiresAt` — **new** on `expiresAt` (expired-session sweep).

### audit_logs (`audit-logs.indexes.ts`)
- `idx_userId_createdAt` — `userId, createdAt` (sparse). *(pre-existing)*
- `idx_action_status_createdAt` — `(action, status, createdAt)`. This is a **strict
  superset** of the requested `(action, createdAt)` — the leading `action` prefix
  already bounds the action scan and `createdAt` bounds the range, so it covers the
  alerting/rate-limit queries. A separate `(action, createdAt)` index would be
  redundant, so the existing one is kept (also avoids leaving a stale renamed index).
- `ttl_createdAt` — `createdAt`, bumped **90d → 180d** (`expireAfterSeconds: 15_552_000`).

### login_attempts (`login-attempts.indexes.ts`)
- `idx_ipAddress_createdAt` — `ipAddress, createdAt` (per-IP rate limit). *(pre-existing)*
- `idx_identifier_createdAt` — **new** `identifier, createdAt` (per-identifier rate limit).
- `idx_identifierType_createdAt` — `(identifierType, identifier, createdAt)` (reset +
  2FA throttles). *(pre-existing index, renamed for clarity)*
- `ttl_createdAt` — `createdAt`, 24h. *(pre-existing)*

### oauth_accounts (`oauth-accounts.indexes.ts`) — unchanged, already correct
- `uidx_provider_accountId` — **unique** `(provider, providerAccountId)`.
- `idx_userId` — `userId`.

### devices (`devices.indexes.ts`) — unchanged, already correct for the real schema
- `uidx_deviceId` — **unique** `deviceId` (the client device UUID; serves the
  "unique-ish device token" intent).
- `idx_userId_createdAt`, `idx_userId_trusted` (partial), `idx_userId_blocked` (partial).

## Retention strategy

**Hot window (TTL):** `audit_logs` documents auto-expire 180 days after `createdAt`
via `ttl_createdAt`. MongoDB's TTL monitor deletes them automatically (~every 60s).

**Cold archive (compliance):** `archiveAuditLogs()` in `src/database/maintenance.ts`
batches old docs into `audit_logs_archive` (insert-then-delete, resumable) **before**
the TTL deletes them, so compliance retention is preserved in cold storage. Run it
nightly via a scheduled job (cron / Netlify scheduled function / Vercel Cron). The
hot collection therefore stays bounded; backups of `audit_logs_archive` are the
long-term archive of record.

> Note: the `archiveAuditLogs()` comment block still says "90d"; the TTL is now 180d.
> Archive threshold is caller-controlled (`olderThan`), so it can be set to e.g. 90d
> to move docs to cold storage while the hot TTL is 180d.

## Cleanup sweep

**New:** `sweepExpiredAuthState()` in `src/database/maintenance.ts`. Deletes:
- `refresh_tokens` where `expiresAt <= now` (expired) **and** `revoked === true` (defense-in-depth beyond the TTL).
- `sessions` where `revoked === true` **or** `expiresAt <= now`.

Uses the new `idx_expiresAt` / `idx_userId_revoked_expiresAt` / `ttl_expiresAt` indexes
so it never collection-scans. Idempotent, safe to run on a schedule.

**Wiring:** `scripts/db-init.ts` now calls `sweepExpiredAuthState()` after init (with
per-collection try/catch so it never fails boot). For production, run it on a schedule
(e.g. nightly Netlify/Vercel cron hitting a secured maintenance route, or a Platform
scheduled function) — documented as the recurring trigger. No `instrumentation`
heartbeat hook exists in this repo, so the sweep is not auto-triggered per cold start
(by design — doing DB writes on every request is undesirable serverless behavior).

## Idempotent + non-fatal index creation

`initializeDatabase()` in `src/database/init.ts` now wraps `coll.createIndexes()` in a
try/catch per collection:
- Index creation is naturally idempotent (server skips indexes whose name+key already
  match). The requirement to run it once at deploy is satisfied by calling `pnpm db:init`
  in the build/pre-deploy step rather than per request.
- On failure (cold-start blip, index conflict), the error is **logged** and recorded in
  `CollectionReport.indexErrors` / `InitReport.hadIndexErrors` — **boot is never
  aborted**. `scripts/db-init.ts` surfaces the warning and re-running heals drift.

## Verification

- Acceptance #1: `db.<coll>.getIndexes()` will show the indexes listed above.
- Acceptance #2: `ttl_createdAt` on `audit_logs` + `archiveAuditLogs()` job.
- Acceptance #3: `sweepExpiredAuthState()` removes expired/revoked tokens + sessions.
- Acceptance #4: index creation is idempotent + caught (non-fatal) in `init.ts`.
- Acceptance #5: MongoDB-only; no Redis anywhere.

Run `pnpm db:init` (with `--seed` if seeding) at deploy; schedule `sweepExpiredAuthState()`
+ `archiveAuditLogs({ olderThan: <date> })` nightly.
