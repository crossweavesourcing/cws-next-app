# Implementation Plan: MongoDB Auth Schema → Next.js Project
**Status: Final — all design decisions resolved and applied**

---

## Background

The [mongodb_auth_schema.md](file:///Users/User/.gemini/antigravity-ide/brain/1dddb9de-7c6e-4c1b-90c4-3b9c90b71b6d/mongodb_auth_schema.md) defines a production-grade, 11-collection authentication database *(final version updated alongside this plan)*.

This plan integrates **only the database layer** into [`cws-next-app`](file:///Users/User/Documents/projects/cws-proj/cws-next-app) (Next.js 16.2.7, no Mongoose/ODM).

> [!IMPORTANT]
> **Scope boundary** — Database layer only:
> - MongoDB driver + connection singleton with retry
> - `$jsonSchema` validators for 11 collections
> - TypeScript types for every document
> - Constants, config validation, health check, observability, shutdown, maintenance
> - Standalone idempotent init CLI script

---

## All Design Decisions (Final)

| # | Decision |
|---|---|
| 1 | `MONGODB_URI` — env var, different per environment |
| 2 | DB name — `cws_auth`, isolated |
| 3 | `init.ts` — standalone CLI only, never API route, idempotent |
| 4 | `src/database/` — dedicated top-level directory |
| 5 | Single `collections.ts` — not 10+ files |
| 6 | `IndexDescription` from `'mongodb'` — no custom IndexDescriptor |
| 7 | `constants.ts` — single source of truth for collection names |
| 8 | `devices` collection — permanent device identity (11th collection) |
| 9 | `avatar` object on `users.profile` — replaces plain `avatarUrl` |
| 10 | Extended device fingerprint — canvas/WebGL/audio hashes + hardware |
| 11 | `observability.ts` — MongoDB command monitoring, slow query detection |
| 12 | `retry.ts` — exponential backoff + jitter for transient errors |
| 13 | `shutdown.ts` — SIGTERM/SIGINT graceful close |
| 14 | `maintenance.ts` — audit log archival, collection stats |
| 15 | `lockExpiresAt` on `login_attempts` — lockout expiry per record |

---

## Complete Target Structure

```
(project root)/
├── scripts/
│   └── db-init.ts                    ← CLI entrypoint (thin wrapper around init.ts)
│
├── .env                              ← MODIFY: add MONGODB_DB_NAME=cws_auth
├── .env.example                      ← NEW: safe-to-commit env template
├── package.json                      ← MODIFY: mongodb, tsx deps; db:init script
│
└── src/
    ├── database/
    │   │
    │   ├── ── Core ────────────────────────────────────────────
    │   ├── constants.ts              ← COLLECTION_NAMES, CollectionName, COLLECTION_ORDER
    │   ├── config.ts                 ← getDatabaseConfig() — validates env vars at startup
    │   ├── client.ts                 ← MongoClient singleton + getDb()
    │   ├── health.ts                 ← checkDatabaseHealth()
    │   ├── collections.ts            ← all 11 typed get*Collection() functions
    │   ├── init.ts                   ← idempotent DB setup (collections + validators + indexes)
    │   │
    │   ├── ── Infrastructure ──────────────────────────────────
    │   ├── observability.ts          ← NEW: command monitoring, slow query logging
    │   ├── retry.ts                  ← NEW: withRetry() exponential backoff
    │   ├── shutdown.ts               ← NEW: SIGTERM/SIGINT graceful shutdown
    │   ├── maintenance.ts            ← NEW: audit archival, prune, stats
    │   │
    │   ├── index.ts                  ← barrel re-export of everything above
    │   │
    │   ├── schemas/
    │   │   ├── index.ts
    │   │   ├── users.schema.ts       ← avatar object, expanded profile
    │   │   ├── user-emails.schema.ts
    │   │   ├── user-phones.schema.ts
    │   │   ├── oauth-accounts.schema.ts
    │   │   ├── sessions.schema.ts    ← added deviceId field
    │   │   ├── refresh-tokens.schema.ts
    │   │   ├── verification-tokens.schema.ts
    │   │   ├── otp-codes.schema.ts
    │   │   ├── audit-logs.schema.ts
    │   │   ├── login-attempts.schema.ts  ← added lockExpiresAt
    │   │   └── devices.schema.ts     ← expanded fingerprint
    │   │
    │   └── indexes/
    │       ├── index.ts
    │       ├── users.indexes.ts
    │       ├── user-emails.indexes.ts
    │       ├── user-phones.indexes.ts
    │       ├── oauth-accounts.indexes.ts
    │       ├── sessions.indexes.ts
    │       ├── refresh-tokens.indexes.ts
    │       ├── verification-tokens.indexes.ts
    │       ├── otp-codes.indexes.ts
    │       ├── audit-logs.indexes.ts
    │       ├── login-attempts.indexes.ts
    │       └── devices.indexes.ts
    │
    └── types/
        └── auth/
            ├── index.ts
            ├── shared.types.ts
            ├── user.types.ts           ← avatar object on UserProfile
            ├── user-email.types.ts
            ├── user-phone.types.ts
            ├── oauth-account.types.ts
            ├── session.types.ts        ← deviceId field
            ├── refresh-token.types.ts
            ├── verification-token.types.ts
            ├── otp-code.types.ts
            ├── audit-log.types.ts
            ├── login-attempt.types.ts  ← lockExpiresAt field
            └── device.types.ts         ← expanded fingerprint
```

---

## Phase-by-Phase Implementation

---

### Phase 1 — Dependency & Environment

#### [MODIFY] `package.json`

```diff
  "dependencies": {
+   "mongodb": "^6.16.0",
  },
  "devDependencies": {
+   "tsx": "^4.19.4",
  },
  "scripts": {
+   "db:init": "tsx --env-file=.env scripts/db-init.ts"
  }
```

> [!NOTE]
> `tsx` uses `--env-file=.env` (Node.js 20+ native flag). No `dotenv` dependency.

#### [MODIFY] `.env`
```diff
  MONGODB_URI=
+ MONGODB_DB_NAME=cws_auth
```

#### [NEW] `.env.example`
```bash
# MongoDB — supply a real URI per environment
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=cws_auth
```

---

### Phase 2 — TypeScript Types (`src/types/auth/`)

#### [NEW] `src/types/auth/shared.types.ts`

| Export | Values |
|---|---|
| `UserRole` | `'admin' \| 'member' \| 'viewer'` |
| `UserStatus` | `'active' \| 'suspended' \| 'deactivated' \| 'pending_invite'` |
| `LoginMethod` | `'password' \| 'google' \| 'linkedin' \| 'whatsapp'` |
| `OAuthProvider` | `'google' \| 'linkedin'` |
| `Platform` | `'web' \| 'mobile' \| 'desktop'` |
| `AuditStatus` | `'SUCCESS' \| 'FAILURE' \| 'WARNING'` |
| `IdentifierType` | `'EMAIL' \| 'PHONE' \| 'GOOGLE' \| 'LINKEDIN' \| 'WHATSAPP'` |
| `VerificationTokenType` | `'email_verification' \| 'password_reset' \| 'email_change' \| 'invite' \| 'magic_link'` |
| `OtpType` | `'whatsapp_login' \| 'phone_verification'` |
| `RevokedBy` | `'user' \| 'admin' \| 'system'` |
| `RevokedReason` | `'rotated' \| 'logout' \| 'session_revoked' \| 'reuse_detected' \| 'admin'` |
| `HashAlgorithm` | `'argon2id' \| 'bcrypt'` |
| `DeviceType` | `'desktop' \| 'mobile' \| 'tablet' \| 'unknown'` |
| `TrustGrantedBy` | `'user' \| 'admin'` |
| `AvatarSource` | `'upload' \| 'google' \| 'linkedin' \| 'gravatar'` |

#### [NEW] `src/types/auth/user.types.ts`

**Key change: `avatar` object replaces flat `avatarUrl`.**

```ts
// Avatar is a structured object — not a plain URL string.
// Supports multiple sources, lazy sync from OAuth providers.
interface UserAvatar {
  url:         string | null;   // final serving URL (CDN or original)
  source:      AvatarSource | null; // where it came from
  originalUrl: string | null;   // raw provider URL (may expire for OAuth)
  updatedAt:   Date | null;
}

interface UserProfile {
  displayName: string;          // required, 1–120 chars
  firstName:   string | null;
  lastName:    string | null;
  avatar:      UserAvatar | null;  // ← replaces avatarUrl
  timezone:    string | null;   // IANA, e.g. 'Asia/Dhaka'
  locale:      string | null;   // BCP 47, e.g. 'en-US'
}
```

**Why a structured avatar object:**
- `source` tells the application whether to sync with the provider (`google` / `linkedin`) or serve as-is (`upload`).
- `originalUrl` captures the raw provider URL — OAuth avatar URLs can expire; storing both lets the app detect staleness.
- `updatedAt` tracks freshness without scanning change history.

#### [NEW] `src/types/auth/device.types.ts`

**Extended `DeviceFingerprint` — passive signals only, hashed where PII is possible.**

```ts
interface DeviceFingerprint {
  // Display
  readonly screenResolution: string | null;   // "1920x1080"
  readonly colorDepth:       number | null;   // bits
  readonly pixelRatio:       number | null;   // window.devicePixelRatio

  // Hardware signals
  readonly hardwareConcurrency: number | null; // logical CPU cores
  readonly deviceMemory:        number | null; // GB (rounded by browser)
  readonly maxTouchPoints:      number | null;
  readonly touchSupport:        boolean | null;

  // Locale & time
  readonly timezone:  string | null;   // IANA
  readonly language:  string | null;   // BCP 47
  readonly languages: string | null;   // comma-joined, e.g. "en-US,en,fr"

  // Browser capabilities
  readonly cookiesEnabled: boolean | null;
  readonly doNotTrack:     string | null;   // "1" | "0" | "unspecified"
  readonly platform:       string | null;   // navigator.platform

  // Hashed entropy sources — SHA-256 digests (no raw data stored)
  readonly canvasHash: string | null;   // canvas 2D rendering fingerprint
  readonly webglHash:  string | null;   // WebGL renderer + vendor info
  readonly audioHash:  string | null;   // AudioContext fingerprint
  readonly fontsHash:  string | null;   // detected font list fingerprint

  // Composite stability score (0.0–1.0) — computed at registration
  // Higher = fingerprint is more stable across sessions
  readonly stabilityScore: number | null;
}
```

> [!NOTE]
> Only **hashes** (SHA-256) are stored for canvas, WebGL, audio, and font fingerprints — never raw canvas pixel data or font lists. This limits PII exposure while retaining anomaly detection value.

#### [MODIFY] `src/types/auth/session.types.ts`
Add `deviceId: ObjectId | null` — nullable for backward compatibility with pre-device sessions.

#### [MODIFY] `src/types/auth/login-attempt.types.ts`
Add `lockExpiresAt: Date | null`.

```ts
// lockExpiresAt — when present, signals that this attempt triggered
// a lockout. Application reads this to reject requests without
// scanning the users.security.lockedUntil field.
lockExpiresAt: Date | null;
```

---

### Phase 3 — Constants (`src/database/constants.ts`)

```ts
export const COLLECTION_NAMES = {
  USERS:               'users',
  USER_EMAILS:         'user_emails',
  USER_PHONES:         'user_phones',
  OAUTH_ACCOUNTS:      'oauth_accounts',
  DEVICES:             'devices',
  SESSIONS:            'sessions',
  REFRESH_TOKENS:      'refresh_tokens',
  VERIFICATION_TOKENS: 'verification_tokens',
  OTP_CODES:           'otp_codes',
  AUDIT_LOGS:          'audit_logs',
  LOGIN_ATTEMPTS:      'login_attempts',
} as const;

export type CollectionName = typeof COLLECTION_NAMES[keyof typeof COLLECTION_NAMES];

// Dependency-safe creation order for init.ts
export const COLLECTION_ORDER: readonly CollectionName[] = [
  COLLECTION_NAMES.USERS,
  COLLECTION_NAMES.USER_EMAILS,
  COLLECTION_NAMES.USER_PHONES,
  COLLECTION_NAMES.OAUTH_ACCOUNTS,
  COLLECTION_NAMES.DEVICES,
  COLLECTION_NAMES.SESSIONS,
  COLLECTION_NAMES.REFRESH_TOKENS,
  COLLECTION_NAMES.VERIFICATION_TOKENS,
  COLLECTION_NAMES.OTP_CODES,
  COLLECTION_NAMES.AUDIT_LOGS,
  COLLECTION_NAMES.LOGIN_ATTEMPTS,
] as const;
```

---

### Phase 4 — Configuration Validation (`src/database/config.ts`)

```ts
export interface DatabaseConfig {
  readonly uri:    string;
  readonly dbName: string;
}

export class DatabaseConfigError extends Error {
  constructor(public readonly violations: string[]) {
    super(`Database configuration is invalid:\n${violations.map(v => `  - ${v}`).join('\n')}`);
    this.name = 'DatabaseConfigError';
  }
}

export function getDatabaseConfig(): DatabaseConfig;
```

**Validations (all checked, all errors reported at once):**
- `MONGODB_URI` — present, non-empty, starts with `mongodb://` or `mongodb+srv://`
- `MONGODB_DB_NAME` — present, non-empty, matches `/^[a-zA-Z0-9_-]{1,38}$/`

---

### Phase 5 — Schema Validators (`src/database/schemas/`)

Transcribed from the updated `mongodb_auth_schema.md`. Key schema changes from previous revision:

#### `users.schema.ts` — `avatar` object in `profile`
```js
avatar: {
  bsonType: ["object", "null"],
  additionalProperties: false,
  properties: {
    url:         { bsonType: ["string", "null"], maxLength: 2048 },
    source:      { bsonType: ["string", "null"],
                   enum: ["upload", "google", "linkedin", "gravatar", null] },
    originalUrl: { bsonType: ["string", "null"], maxLength: 2048 },
    updatedAt:   { bsonType: ["date", "null"] }
  }
}
```

#### `sessions.schema.ts` — new `deviceId` field
```js
deviceId: {
  bsonType: ["objectId", "null"],
  description: "References devices._id; null for legacy sessions created before device tracking"
}
```

#### `login-attempts.schema.ts` — new `lockExpiresAt` field
```js
lockExpiresAt: {
  bsonType: ["date", "null"],
  description: "When set, this attempt triggered a lockout expiring at this timestamp"
}
```

#### `devices.schema.ts` — expanded fingerprint (see Phase 2 device types)

---

### Phase 6 — Index Definitions (`src/database/indexes/`)

Using `import type { IndexDescription } from 'mongodb'` in every file — no custom type.

| Collection | Indexes | Count |
|---|---|---|
| `users` | — | 0 |
| `user_emails` | uidx_email, idx_userId, uidx_userId_primary | 3 |
| `user_phones` | uidx_e164 (sparse), idx_userId, uidx_userId_primary | 3 |
| `oauth_accounts` | uidx_provider_accountId, idx_userId | 2 |
| `devices` | uidx_deviceId, idx_userId_createdAt, idx_userId_trusted (partial), idx_userId_blocked (partial) | 4 |
| `sessions` | idx_userId_createdAt, idx_userId_active | 2 |
| `refresh_tokens` | uidx_tokenHash, idx_sessionId, idx_userId, ttl_expiresAt | 4 |
| `verification_tokens` | uidx_tokenHash, idx_userId_type (sparse), ttl_expiresAt | 3 |
| `otp_codes` | idx_e164_active, ttl_expiresAt | 2 |
| `audit_logs` | idx_userId_createdAt (sparse), idx_action_status_createdAt, ttl_createdAt (90d) | 3 |
| `login_attempts` | idx_ipAddress_createdAt, idx_identifier_createdAt, ttl_createdAt (24h) | 3 |
| **Total** | | **29** |

---

### Phase 7 — Connection Client (`src/database/client.ts`)

- `getMongoClient()` — singleton, `globalThis` pattern (dev hot-reload), calls `getDatabaseConfig()`.
- `getDb()` — returns `client.db(config.dbName)`.
- `MongoClient` is imported **only here**. All other files use `getDb()`.

**`client.ts` also wires up observability on first connection:**
```ts
const client = new MongoClient(config.uri, { monitorCommands: true });
setupDatabaseObservability(client);  // from observability.ts
```

---

### Phase 8 — Health Check (`src/database/health.ts`)

```ts
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status:      HealthStatus;
  database:    string;
  ping:        boolean;
  latencyMs:   number;
  collections: number;      // 0 = not initialized (degraded)
  checkedAt:   Date;
  error?:      string;
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult>;
```

| Condition | Status |
|---|---|
| Ping OK + 11 collections found | `healthy` |
| Ping OK + collections < 11 | `degraded` |
| Ping fails or any error | `unhealthy` |

---

### Phase 9 — Observability (`src/database/observability.ts`)

Wraps MongoDB driver's built-in **command monitoring** (`monitorCommands: true` on `MongoClient`).

```ts
export interface ObservabilityOptions {
  slowQueryThresholdMs?: number;    // default: 100
  enableCommandLogging?: boolean;   // default: false in prod, true in dev
  onSlowQuery?: (event: SlowQueryEvent) => void;
  onCommandError?: (event: CommandErrorEvent) => void;
}

export interface SlowQueryEvent {
  command:     string;              // e.g. 'find', 'update', 'aggregate'
  collection:  string;
  durationMs:  number;
  requestId:   number;
  timestamp:   Date;
}

export function setupDatabaseObservability(
  client: MongoClient,
  options?: ObservabilityOptions
): void;
```

**Events monitored:**
- `commandStarted` — records start time keyed by `requestId`
- `commandSucceeded` — computes duration; emits `SlowQueryEvent` if over threshold
- `commandFailed` — logs structured error; calls `onCommandError` callback

**Structured log line format (JSON):**
```json
{
  "level":      "warn",
  "event":      "db.slow_query",
  "command":    "find",
  "collection": "sessions",
  "durationMs": 245,
  "timestamp":  "2026-07-10T03:00:00.000Z"
}
```

> [!NOTE]
> Observability adds **zero overhead when disabled**. In production, only slow-query events (above threshold) are emitted. Raw command logging is off by default.

---

### Phase 10 — Retry Strategy (`src/database/retry.ts`)

```ts
export interface RetryOptions {
  maxAttempts:    number;   // default: 3
  initialDelayMs: number;   // default: 100
  maxDelayMs:     number;   // default: 5000
  backoffFactor:  number;   // default: 2.0  (exponential)
  jitterFactor:   number;   // default: 0.3  (± 30% of computed delay)
}

/**
 * Retries `operation` on transient MongoDB errors using exponential backoff + jitter.
 * Non-retryable errors (e.g. validation failures, duplicate key) are thrown immediately.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T>;
```

**Retryable error codes:**
| Code | Meaning |
|---|---|
| `MongoNetworkError` | Connection dropped mid-request |
| `MongoNetworkTimeoutError` | Timeout waiting for server |
| Server error 11600 | `InterruptedAtShutdown` |
| Server error 91 | `ShutdownInProgress` |
| Server error 189 | `PrimarySteppedDown` |
| Server error 216 | `ElectionInProgress` |

**NOT retried:** `MongoServerError` with codes like 11000 (duplicate key), 121 (document validation failure). These are permanent failures.

**Delay formula:**
```
delay = min(initialDelayMs × backoffFactor^(attempt-1), maxDelayMs)
delay = delay × (1 + jitter × (Math.random() * 2 - 1))
```

---

### Phase 11 — Graceful Shutdown (`src/database/shutdown.ts`)

```ts
export interface ShutdownOptions {
  timeoutMs?:           number;     // max time to wait for close() — default: 5000
  onBeforeShutdown?:    () => void | Promise<void>;
  onAfterShutdown?:     () => void | Promise<void>;
}

/**
 * Registers SIGTERM and SIGINT handlers.
 * On signal: calls onBeforeShutdown → client.close() → onAfterShutdown → process.exit(0).
 * On close timeout: logs error and calls process.exit(1).
 *
 * Call once at process startup (in scripts/db-init.ts and in Next.js instrumentation).
 */
export function registerShutdownHandlers(options?: ShutdownOptions): void;
```

**Signal handling:**
- `SIGTERM` — sent by Docker, Kubernetes, and process managers (graceful stop)
- `SIGINT` — sent by Ctrl+C in terminal (developer interrupt)
- Both signals call the same handler; second signal forces immediate exit

**Next.js integration point:**
For the Next.js server, register in `src/instrumentation.ts` (Next.js 15.x instrumentation hook):
```ts
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerShutdownHandlers } = await import('@/database/shutdown');
    registerShutdownHandlers();
  }
}
```

> [!IMPORTANT]
> `shutdown.ts` must only be called **once per process**. Calling it multiple times registers duplicate signal handlers. The function guards against duplicate registration internally.

---

### Phase 12 — Maintenance (`src/database/maintenance.ts`)

Operational utilities for long-running collections. Designed to be called from cron jobs or admin scripts — not from request handlers.

```ts
export interface ArchiveOptions {
  olderThan:         Date;
  batchSize?:        number;   // default: 500 — avoid large in-memory arrays
  archiveCollection: string;   // default: 'audit_logs_archive'
  dryRun?:           boolean;  // if true, count docs but don't move them
}

export interface ArchiveResult {
  scanned:  number;
  archived: number;
  errors:   number;
  durationMs: number;
}

export interface CollectionStat {
  collection: CollectionName;
  documentCount: number;
  sizeBytes:     number;
  avgDocSizeBytes: number;
  indexSizeBytes:  number;
}

// Moves audit_logs older than `options.olderThan` to a cold archive collection.
// Uses bulk insertMany + deleteMany in batches to avoid large transactions.
export async function archiveAuditLogs(options: ArchiveOptions): Promise<ArchiveResult>;

// Manual TTL enforcement — deletes documents past their expiresAt/createdAt
// in collections where TTL indexes may be lagging. Runs in batches.
export async function pruneExpiredDocuments(): Promise<Record<CollectionName, number>>;

// Returns document count, storage size, and index size for all 11 collections.
// Used by monitoring dashboards and the db:init script post-run report.
export async function getCollectionStats(): Promise<CollectionStat[]>;
```

**Audit log growth management strategy (in priority order):**

| Strategy | When to use |
|---|---|
| TTL index (90d, default) | Always active — handles the common case automatically |
| `archiveAuditLogs()` | When compliance requires >90d retention; run nightly before TTL deletes |
| Reduce TTL via `collMod` | When storage cost is a concern; safe after archival is confirmed |
| Separate `audit_logs_archive` collection | Cold storage for archived events; no indexes except `_id` and `createdAt` |

---

### Phase 13 — Collection Accessors (`src/database/collections.ts`)

Single file, 11 typed functions, one pattern:

```ts
export const getDevicesCollection =
  (): Promise<Collection<DeviceDocument>> =>
    getDb().then(db => db.collection<DeviceDocument>(COLLECTION_NAMES.DEVICES));
```

All collection names come from `COLLECTION_NAMES`. No raw strings.

---

### Phase 14 — Database Initializer

#### `src/database/init.ts` — pure logic, no side effects

- Loops over `COLLECTION_ORDER` from `constants.ts`.
- Creates/updates each collection with `$jsonSchema` validator (`strict` / `error`).
- Creates all indexes using `IndexDescription[]` from `ALL_INDEXES`.
- Returns `InitReport`.

#### `scripts/db-init.ts` — CLI entrypoint

```
Sequence:
  1. getDatabaseConfig()    ← validate env vars first, fail fast
  2. getMongoClient()       ← connect
  3. registerShutdownHandlers()   ← handle Ctrl+C gracefully
  4. checkDatabaseHealth()  ← pre-flight: is cluster reachable?
  5. initializeDatabase()   ← create/update collections + indexes
  6. checkDatabaseHealth()  ← post-flight: confirm 11 collections
  7. getCollectionStats()   ← print storage report
  8. client.close()
  9. process.exit(0)
```

---

### Phase 15 — Top-Level Barrel (`src/database/index.ts`)

```ts
export { getDatabaseConfig, DatabaseConfigError } from './config';
export { getMongoClient, getDb }                 from './client';
export { checkDatabaseHealth }                   from './health';
export { setupDatabaseObservability }            from './observability';
export { withRetry }                             from './retry';
export { registerShutdownHandlers }              from './shutdown';
export { archiveAuditLogs, pruneExpiredDocuments, getCollectionStats } from './maintenance';
export { initializeDatabase }                    from './init';
export { COLLECTION_NAMES, COLLECTION_ORDER }   from './constants';
export type { CollectionName }                   from './constants';
export * from './collections';
export * from './schemas';
export * from './indexes';
```

---

## Complete File Count (Final)

| Layer | Action | Files |
|---|---|---|
| `package.json` | MODIFY | 1 |
| `.env` | MODIFY | 1 |
| `.env.example` | NEW | 1 |
| `scripts/db-init.ts` | NEW | 1 |
| `src/database/constants.ts` | NEW | 1 |
| `src/database/config.ts` | NEW | 1 |
| `src/database/client.ts` | NEW | 1 |
| `src/database/health.ts` | NEW | 1 |
| `src/database/observability.ts` | NEW | 1 |
| `src/database/retry.ts` | NEW | 1 |
| `src/database/shutdown.ts` | NEW | 1 |
| `src/database/maintenance.ts` | NEW | 1 |
| `src/database/collections.ts` | NEW | 1 |
| `src/database/init.ts` | NEW | 1 |
| `src/database/index.ts` | NEW | 1 |
| `src/database/schemas/` | NEW | 12 (11 schemas + index.ts) |
| `src/database/indexes/` | NEW | 12 (11 index files + index.ts) |
| `src/types/auth/` | NEW | 13 (12 types + index.ts) |
| **Total new files** | | **52 new + 2 modified** |

---

## Execution Order (Dependency Chain)

```
Phase 1  — Install deps; update .env; .env.example
    ↓
Phase 2  — src/types/auth/    (pure TS, zero DB imports)
    ↓
Phase 3  — constants.ts       (pure TS, no imports)
    ↓
Phase 4  — config.ts          (reads process.env only)
    ↓
Phase 5  — schemas/           (type-only import from 'mongodb')
    ↓
Phase 6  — indexes/           (type-only import from 'mongodb')
    ↓
Phase 7  — client.ts          (imports MongoClient + config + observability)
    ↓
Phase 8  — health.ts          (imports getDb)
    ↓
Phase 9  — observability.ts   (imports MongoClient type only)
    ↓
Phase 10 — retry.ts           (imports MongoError types only)
    ↓
Phase 11 — shutdown.ts        (imports getMongoClient)
    ↓
Phase 12 — maintenance.ts     (imports getDb + constants)
    ↓
Phase 13 — collections.ts     (imports getDb + types + constants)
    ↓
Phase 14 — init.ts + scripts/db-init.ts  (imports everything)
    ↓
Phase 15 — index.ts           (barrel, no new logic)
```

---

## Verification Plan

```bash
# 1. Dependencies
pnpm install
# Verify: mongodb@^6.16, tsx@^4.19 in pnpm-lock.yaml

# 2. TypeScript
pnpm tsc --noEmit
# Expected: 0 errors after every phase

# 3. Config validation
MONGODB_URI="" pnpm tsx -e "
  import('@/database/config').then(m => m.getDatabaseConfig())
"
# Expected: DatabaseConfigError listing all invalid vars

# 4. Run init against real cluster
pnpm db:init
# Expected: 11 collections + 29 indexes created, health=healthy

# 5. Idempotency
pnpm db:init
# Expected: all 'updated', all indexes 'exist', no errors

# 6. Schema rejection
# In mongosh: db.users.insertOne({ bad: 'field' })
# Expected: MongoServerError: Document failed validation

# 7. Health check
pnpm tsx -e "
  import('@/database').then(m =>
    m.checkDatabaseHealth().then(r => console.log(JSON.stringify(r, null, 2)))
  )
"
# Expected: { status: 'healthy', collections: 11, ... }

# 8. Retry (simulate network error)
# Unit test: mock getDb() to fail twice, succeed on 3rd. Verify withRetry resolves.

# 9. Final build
pnpm build
# Expected: 0 TypeScript errors, successful production bundle
```

---

## Untouched Files

`src/lib/`, `src/types.ts`, `src/components/`, `src/context/`, all pages, all API routes, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` — no changes.
