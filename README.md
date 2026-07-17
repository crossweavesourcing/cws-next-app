# CWS Next App

A private Next.js 16 application with a production-grade MongoDB authentication and authorization database layer.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Security scan + production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:init` | Initialize MongoDB database (idempotent) |

---

## Database Setup

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
2. Set `MONGODB_URI` to your Atlas or local replica set connection string.
3. Run the one-time initializer (safe to re-run):
   ```bash
   pnpm db:init
   ```

See [`docs/db_implementation_plan.md`](docs/db_implementation_plan.md) for the full architecture and [`docs/mongodb_auth_schema.md`](docs/mongodb_auth_schema.md) for the complete schema design.

---

## Deployment & Secrets Management

`.env` is **gitignored** and must never be committed. The committed
`.env.example` contains only non-secret dev placeholders so the app boots
locally with `pnpm dev`. **No real secret is required in a checked-in file to
boot locally.**

### Deployment runbook (rotate + inject secrets)

The 6 secret variables — `MONGODB_URI`, `SESSION_SECRET`, `ARGON2_SECRET`,
`GOOGLE_CLIENT_SECRET`, `EMAIL_PASSWORD`, `ADMIN_SEED_PASSWORD` — MUST be
sourced from a secret manager in **every** non-local environment and **NEVER
committed**. Follow these steps for each new/changed deployment:

1. **Rotate the Atlas DB user password in MongoDB Atlas.**
   Create/rotate the database user in Atlas → *Database Access*, then generate
   a fresh `MONGODB_URI` connection string with the new username + password.
   Never reuse the previously-shipped/example Atlas credential.
2. **Generate unique secrets per environment.**
   - `SESSION_SECRET`: a UNIQUE ≥32-char value per environment:
     `openssl rand -hex 32`
   - `ARGON2_SECRET`: a UNIQUE ≥16-char value per environment:
     `openssl rand -hex 32` (or any ≥16 random chars)
   Do **not** share these across environments.
3. **Inject all 6 secret vars via the platform secret store.**
   - **Vercel:** *Project → Settings → Environment Variables* → add each var
     for the target environments (Production / Preview / Development), or via
     CLI: `vercel env add MONGODB_URI production` (paste the value when
     prompted — it is stored encrypted, never written to a file).
   - **Netlify:** *Site settings → Environment variables* → add each var, or
     via CLI: `netlify env:set MONGODB_URI "<from secret manager>"`. The 6
     secret var names are enumerated in `netlify.toml`; **never put real
     values in `netlify.toml` itself.**
   - Vault / AWS Secrets Manager: mount the secret as platform env at
     build/runtime via your existing integration.
4. **Set `TRUSTED_PROXY_IP_HEADER` for production.** A fail-closed boot guard
   already exists in `src/auth/config/env.ts` — the app **refuses to boot** in
   production without it (client IP would resolve to the untrusted `0.0.0.0`
   sentinel, collapsing the per-IP rate limit into a single global bucket).
   Set it to your platform's trusted header (e.g. `x-vercel-proxied-for`) and
   strip inbound `x-forwarded-for` at the edge.
5. **Verify the build passes with manager-injected vars.**
   `pnpm build` runs `security-scan.js` first; ensure it passes with the
   injected secrets and no real value committed. A misconfigured deploy with a
   missing secret now fails closed at boot (see the pre-flight check in
   `src/auth/config/env.ts`) instead of booting insecurely.

> **CI secret scanning (recommended):** the husky pre-commit hook only greps
> *staged diffs*, so an already-on-disk secret is invisible to it. Keep a
> CI-level secret scan (e.g. gitleaks / trufflehog on the full history) as a
> second line of defense. The pre-commit hook is intentionally left unchanged.

### Sensitive variables

These MUST be sourced from a secret manager / platform environment in **every
non-local environment (staging, preview, production)** — never committed,
hard-coded, or pasted into a checked-in file:

| Variable | Why it is sensitive |
|---|---|
| `MONGODB_URI` | Embeds the Atlas database username + password |
| `SESSION_SECRET` | HMAC-signs the `cws_session` / `cws_2fa_pending` / `cws_pw_pending` cookies (forgery risk if leaked) |
| `ARGON2_SECRET` | Application-side password-hash pepper; protects hashes in a DB leak |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `EMAIL_PASSWORD` | Gmail SMTP "App Password" |
| `ADMIN_SEED_PASSWORD` | Initial admin account password |

Supported sources: your platform's project environment variables
(**Vercel** / **Netlify**), **HashiCorp Vault**, or **AWS Secrets Manager**.
`src/auth/config/env.ts` already reads everything from `process.env` via
`getEnv()`, so no code change is needed — the deploy pipeline simply injects
the values at build/runtime.

### Platform env injection

- **Netlify:** set the variables under **Site settings → Environment
  variables**. `netlify.toml` runs `pnpm install --frozen-lockfile && pnpm
  build`; the build exposes those env vars to both the build step and the
  server functions. No real values are stored in `netlify.toml`.
- **Vercel:** set the variables under **Project → Settings → Environment
  Variables** for each environment (Production / Preview / Development). The
  app reads them from `process.env` at runtime — no extra config required.

### Generate secrets

```bash
# SESSION_SECRET / ARGON2_SECRET — a UNIQUE value per environment
openssl rand -hex 32
```

### Rotate before any real deployment

- **`SESSION_SECRET`:** the default in `.env.example` and the previously-shipped
  static value are **blocklisted** in `src/auth/config/env.ts` — the app
  refuses to boot in production with them. Always generate a fresh, unique
  value per environment.
- **MongoDB Atlas credential:** rotate the database user password; the
  previously-used/example DB credential must not ship to a real environment.
  Update `MONGODB_URI` in the secret store after rotation.

---

## Documentation

- [`docs/db_implementation_plan.md`](docs/db_implementation_plan.md) — full 15-phase implementation plan
- [`docs/mongodb_auth_schema.md`](docs/mongodb_auth_schema.md) — production-grade 11-collection schema design

---

---

# MongoDB Auth Database — Implementation Verification Report

> **Verification Date:** 2026-07-12  
> **Reference Plan:** [`docs/db_implementation_plan.md`](docs/db_implementation_plan.md)  
> **TypeScript check:** `tsc --noEmit` → **0 errors**  
> **Production build:** `next build` → **✅ Passed**

---

## Overall Result

| Check | Result |
|---|---|
| All 52 planned files created | ✅ Pass |
| 15 design decisions implemented | ✅ Pass |
| TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| Next.js production build | ✅ Clean |
| Pre-commit + pre-push hooks | ✅ Passing |
| No ODM / Mongoose in codebase | ✅ Confirmed |
| All collection names from `COLLECTION_NAMES` constant | ✅ Confirmed |

---

## Phase-by-Phase Verification

### Phase 1 — Dependencies & Environment ✅

| Item | Expected | Actual |
|---|---|---|
| `mongodb` dependency | `^6.16.0` | `6.16.0` installed |
| `tsx` devDependency | `^4.19.4` | `4.23.0` installed |
| `db:init` script | `tsx --env-file=.env scripts/db-init.ts` | ✅ Matches |
| `.env` `MONGODB_DB_NAME` | `cws_auth` | ✅ Present |
| `.env.example` | New file | ✅ Created |
| `pnpm.onlyBuiltDependencies` | `["esbuild"]` | ✅ Set (fixes pre-commit hook) |

### Phase 2 — TypeScript Types (`src/types/auth/`) ✅

All 13 required files are present:

| File | Key Exports | Status |
|---|---|---|
| `shared.types.ts` | `UserRole`, `UserStatus`, `LoginMethod`, `OAuthProvider`, `Platform`, `AuditStatus`, `IdentifierType`, `VerificationTokenType`, `OtpType`, `RevokedBy`, `RevokedReason`, `HashAlgorithm`, `DeviceType`, `TrustGrantedBy`, `AvatarSource`, `BlockedBy` | ✅ |
| `user.types.ts` | `UserAvatar` (structured object), `UserProfile`, `UserPassword`, `UserSecurity`, `UserMetadata`, `UserDocument` | ✅ |
| `user-email.types.ts` | `UserEmailDocument` | ✅ |
| `user-phone.types.ts` | `UserPhoneDocument` (E.164) | ✅ |
| `oauth-account.types.ts` | `OAuthAccountDocument` | ✅ |
| `session.types.ts` | `SessionDocument` with `deviceId: ObjectId \| null` | ✅ |
| `refresh-token.types.ts` | `RefreshTokenDocument` (rotation chain) | ✅ |
| `verification-token.types.ts` | `VerificationTokenDocument` | ✅ |
| `otp-code.types.ts` | `OtpCodeDocument` | ✅ |
| `audit-log.types.ts` | `AuditLogDocument`, `AuditActor`, `AuditSource`, `AuditResource` | ✅ |
| `login-attempt.types.ts` | `LoginAttemptDocument` with `lockExpiresAt: Date \| null` | ✅ |
| `device.types.ts` | `DeviceDocument`, `DeviceFingerprint` (canvas/WebGL/audio/font hashes + `stabilityScore`) | ✅ |
| `index.ts` | Re-exports all types and enums | ✅ |

**Design decision checks:**
- `avatar` is a structured `UserAvatar` object — not a plain `avatarUrl` string ✅  
- `DeviceFingerprint` includes `canvasHash`, `webglHash`, `audioHash`, `fontsHash`, `stabilityScore`, `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`, `languages`, `pixelRatio` ✅  
- `lockExpiresAt: Date | null` present on `LoginAttemptDocument` ✅  
- `deviceId: ObjectId | null` present on `SessionDocument` ✅

### Phase 3 — Constants (`src/database/constants.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `COLLECTION_NAMES` object | 11 keys, `as const` | ✅ Matches exactly |
| `CollectionName` type | Derived union from `COLLECTION_NAMES` | ✅ |
| `COLLECTION_ORDER` | 11-element `readonly` array in dependency order | ✅ |
| Order correctness | `users → user_emails → ... → devices → sessions → ... → login_attempts` | ✅ |

### Phase 4 — Config Validation (`src/database/config.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `DatabaseConfig` interface | `{ uri: string; dbName: string }` | ✅ |
| `DatabaseConfigError` class | Extends `Error`, `violations: string[]` | ✅ |
| `getDatabaseConfig()` | Validates both vars, throws `DatabaseConfigError` on failure | ✅ |
| `MONGODB_URI` validation | Non-empty, `mongodb://` or `mongodb+srv://` prefix | ✅ |
| `MONGODB_DB_NAME` validation | `/^[a-zA-Z0-9_-]{1,38}$/` | ✅ |
| Reports all violations at once | Yes — violations array collects all before throwing | ✅ |

**Verified:** Running `tsx scripts/db-init.ts` with empty `.env` correctly throws:  
`DatabaseConfigError: MONGODB_URI: environment variable is not set`

### Phase 5 — Schema Validators (`src/database/schemas/`) ✅

All 12 files present (11 collection schemas + `index.ts`).

| Schema | Key Validations | Status |
|---|---|---|
| `users.schema.ts` | `avatar` object with `url/source/originalUrl/updatedAt`, nullable `password`, `profile.displayName` required | ✅ |
| `user-emails.schema.ts` | Email regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`, 5–254 chars | ✅ |
| `user-phones.schema.ts` | E.164 pattern `^\+[1-9]\d{6,14}$` | ✅ |
| `oauth-accounts.schema.ts` | `provider` enum `['google','linkedin']`, `providerAccountId` 1–256 chars | ✅ |
| `devices.schema.ts` | Full fingerprint with hash fields (64-char SHA-256), `stabilityScore` 0.0–1.0, trust/block lifecycle | ✅ |
| `sessions.schema.ts` | `deviceId: ['objectId','null']` present | ✅ |
| `refresh-tokens.schema.ts` | `tokenHash` 64-char, `rotationNumber >= 0`, `revokedReason` enum | ✅ |
| `verification-tokens.schema.ts` | `type` enum with all 5 values | ✅ |
| `otp-codes.schema.ts` | E.164 constraint, `attempts`, `maxAttempts` 1–10 | ✅ |
| `audit-logs.schema.ts` | `action` 1–100 chars, `status` enum | ✅ |
| `login-attempts.schema.ts` | `lockExpiresAt: ['date','null']` present | ✅ |
| `index.ts` | `ALL_SCHEMAS: Record<CollectionName, Document>` — TypeScript enforces completeness | ✅ |

All schemas use `validationLevel: 'strict'`, `validationAction: 'error'` via `init.ts` ✅

### Phase 6 — Index Definitions (`src/database/indexes/`) ✅

All 12 files present (11 index files + `index.ts`). Total index count matches plan:

| Collection | Indexes | Plan Count | Actual |
|---|---|---|---|
| `users` | — | 0 | ✅ 0 |
| `user_emails` | `uidx_email`, `idx_userId`, `uidx_userId_primary` (partial) | 3 | ✅ 3 |
| `user_phones` | `uidx_e164` (sparse), `idx_userId`, `uidx_userId_primary` (partial) | 3 | ✅ 3 |
| `oauth_accounts` | `uidx_provider_accountId`, `idx_userId` | 2 | ✅ 2 |
| `devices` | `uidx_deviceId`, `idx_userId_createdAt`, `idx_userId_trusted` (partial), `idx_userId_blocked` (partial) | 4 | ✅ 4 |
| `sessions` | `idx_userId_createdAt`, `idx_userId_active` | 2 | ✅ 2 |
| `refresh_tokens` | `uidx_tokenHash`, `idx_sessionId`, `idx_userId`, `ttl_expiresAt` | 4 | ✅ 4 |
| `verification_tokens` | `uidx_tokenHash`, `idx_userId_type` (sparse), `ttl_expiresAt` | 3 | ✅ 3 |
| `otp_codes` | `idx_e164_active`, `ttl_expiresAt` | 2 | ✅ 2 |
| `audit_logs` | `idx_userId_createdAt` (sparse), `idx_action_status_createdAt`, `ttl_createdAt` (90d) | 3 | ✅ 3 |
| `login_attempts` | `idx_ipAddress_createdAt`, `idx_identifier_createdAt`, `ttl_createdAt` (24h) | 3 | ✅ 3 |
| **Total** | | **29** | **✅ 29** |

`ALL_INDEXES: Record<CollectionName, IndexDescription[]>` enforces completeness at compile time ✅  
All index files use `import type { IndexDescription } from 'mongodb'` — no custom wrapper types ✅

### Phase 7 — Connection Client (`src/database/client.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `MongoClient` singleton | `globalThis.__mongoClient` hot-reload guard | ✅ |
| `monitorCommands: true` | Wired at client creation | ✅ |
| `setupDatabaseObservability(client)` called | Before `client.connect()` | ✅ |
| `getDb()` returns `client.db(config.dbName)` | Yes | ✅ |
| `MongoClient` imported only here | ✅ (other files import `getDb` only) | ✅ |
| Pool config | `maxPoolSize: 10`, `minPoolSize: 2`, `maxIdleTimeMS: 30_000` | ✅ |
| Timeouts | `serverSelectionTimeoutMS: 5_000`, `socketTimeoutMS: 10_000`, `connectTimeoutMS: 10_000` | ✅ |

### Phase 8 — Health Check (`src/database/health.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `HealthStatus` type | `'healthy' \| 'degraded' \| 'unhealthy'` | ✅ |
| `HealthCheckResult` interface | `status`, `database`, `ping`, `latencyMs`, `collections`, `checkedAt`, `error?` | ✅ |
| `healthy` condition | ping OK + `collections >= 11` | ✅ |
| `degraded` condition | ping OK + `collections < 11` | ✅ |
| `unhealthy` condition | any error | ✅ |
| Error non-throwing | Returns result object, never throws | ✅ |

### Phase 9 — Observability (`src/database/observability.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `ObservabilityOptions` interface | `slowQueryThresholdMs`, `enableCommandLogging`, `onSlowQuery`, `onCommandError` | ✅ |
| `SlowQueryEvent` | `command`, `collection`, `durationMs`, `requestId`, `timestamp` | ✅ |
| `CommandErrorEvent` | Includes `errorCode`, `errorMsg` | ✅ |
| `commandStarted` handler | Records start time by `requestId` | ✅ |
| `commandSucceeded` handler | Computes duration, emits slow query event if over threshold | ✅ |
| `commandFailed` handler | Logs structured error, calls `onCommandError` | ✅ |
| Structured JSON log format | `{ level, event, command, durationMs, ts }` | ✅ |
| Default `slowQueryThresholdMs` | `100` ms | ✅ |
| `enableCommandLogging` default | `true` in dev, `false` in prod | ✅ |
| Duplicate registration guard | `WeakSet<MongoClient>` check | ✅ |

### Phase 10 — Retry Strategy (`src/database/retry.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `RetryOptions` interface | `maxAttempts`, `initialDelayMs`, `maxDelayMs`, `backoffFactor`, `jitterFactor` | ✅ |
| Defaults | `3`, `100`, `5000`, `2.0`, `0.3` | ✅ |
| `withRetry<T>()` signature | `(operation, options?) => Promise<T>` | ✅ |
| `MongoNetworkError` retried | ✅ | ✅ |
| `MongoNetworkTimeoutError` retried | ✅ | ✅ |
| Server code `11600` (InterruptedAtShutdown) retried | ✅ | ✅ |
| Server code `91` (ShutdownInProgress) retried | ✅ | ✅ |
| Server code `189` (PrimarySteppedDown) retried | ✅ | ✅ |
| Server code `216` (ElectionInProgress) retried | ✅ | ✅ |
| Permanent errors thrown immediately | Yes — non-retryable bypass loop | ✅ |
| Delay formula | `min(initial × factor^(attempt-1), max) × (1 + jitter×(random×2-1))` | ✅ |
| Retry log | `JSON.stringify` to `console.warn` | ✅ |

**Minor note:** `WriteConcernFailed (code 64)` is included as a bonus retryable code — not in the plan but valid ✅

### Phase 11 — Graceful Shutdown (`src/database/shutdown.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `ShutdownOptions` interface | `timeoutMs`, `onBeforeShutdown`, `onAfterShutdown` | ✅ |
| `registerShutdownHandlers()` | Registers `SIGTERM` + `SIGINT` | ✅ |
| Sequence | `onBeforeShutdown → client.close() → onAfterShutdown → exit(0)` | ✅ |
| Timeout guard | `setTimeout` → `exit(1)` after `timeoutMs` (default 5000ms) | ✅ |
| Second-signal force exit | `shutdownInProgress` flag → `exit(1)` | ✅ |
| Duplicate registration guard | `handlersRegistered` boolean flag | ✅ |
| Next.js hook | `src/instrumentation.ts` registers on `NEXT_RUNTIME === 'nodejs'` | ✅ |

### Phase 12 — Maintenance (`src/database/maintenance.ts`) ✅

| Item | Expected | Actual |
|---|---|---|
| `ArchiveOptions` | `olderThan`, `batchSize?`, `archiveCollection?`, `dryRun?` | ✅ |
| `ArchiveResult` | `scanned`, `archived`, `errors`, `durationMs`, `dryRun` | ✅ |
| `archiveAuditLogs()` | Batched `insertMany` + `deleteMany`, supports dry-run | ✅ |
| `pruneExpiredDocuments()` | Manual TTL for 5 collections (refresh_tokens, verification_tokens, otp_codes, login_attempts, audit_logs) | ✅ |
| `CollectionStat` interface | `collection`, `documentCount`, `sizeBytes`, `avgDocSizeBytes`, `indexSizeBytes` | ✅ |
| `getCollectionStats()` | Returns stats for all 11 collections | ✅ |

### Phase 13 — Collection Accessors (`src/database/collections.ts`) ✅

Single file with all 11 typed accessor functions:

| Function | Document Type | Status |
|---|---|---|
| `getUsersCollection()` | `Collection<UserDocument>` | ✅ |
| `getUserEmailsCollection()` | `Collection<UserEmailDocument>` | ✅ |
| `getUserPhonesCollection()` | `Collection<UserPhoneDocument>` | ✅ |
| `getOAuthAccountsCollection()` | `Collection<OAuthAccountDocument>` | ✅ |
| `getDevicesCollection()` | `Collection<DeviceDocument>` | ✅ |
| `getSessionsCollection()` | `Collection<SessionDocument>` | ✅ |
| `getRefreshTokensCollection()` | `Collection<RefreshTokenDocument>` | ✅ |
| `getVerificationTokensCollection()` | `Collection<VerificationTokenDocument>` | ✅ |
| `getOtpCodesCollection()` | `Collection<OtpCodeDocument>` | ✅ |
| `getAuditLogsCollection()` | `Collection<AuditLogDocument>` | ✅ |
| `getLoginAttemptsCollection()` | `Collection<LoginAttemptDocument>` | ✅ |

All collection names sourced from `COLLECTION_NAMES` — no raw strings ✅

### Phase 14 — Database Initializer ✅

**`src/database/init.ts`** (pure logic):

| Item | Expected | Actual |
|---|---|---|
| Loops `COLLECTION_ORDER` | ✅ | ✅ |
| Creates new collection with `$jsonSchema`, `validationLevel: 'strict'`, `validationAction: 'error'` | ✅ | ✅ |
| Updates existing via `collMod` (no drops) | ✅ | ✅ |
| `createIndexes()` called for each (idempotent) | ✅ | ✅ |
| Returns typed `InitReport` | ✅ | ✅ |
| No `process.exit()` / console output / side effects | ✅ | ✅ |

**`scripts/db-init.ts`** (CLI wrapper):

| Step | Expected | Actual |
|---|---|---|
| 1. `getDatabaseConfig()` | First call — fail fast on bad config | ✅ |
| 2. `getMongoClient()` | Connect | ✅ |
| 3. `registerShutdownHandlers()` | Register SIGTERM/SIGINT | ✅ |
| 4. `checkDatabaseHealth()` | Pre-flight check | ✅ |
| 5. `initializeDatabase()` | Core init | ✅ |
| 6. `checkDatabaseHealth()` | Post-flight check | ✅ |
| 7. `getCollectionStats()` | Storage report | ✅ |
| 8. `client.close()` | Cleanup in `.finally()` | ✅ |
| Colored terminal output | ANSI codes for headings, status, table | ✅ |

### Phase 15 — Top-Level Barrel (`src/database/index.ts`) ✅

| Item | Plan | Actual | Status |
|---|---|---|---|
| `getDatabaseConfig`, `DatabaseConfigError` | from `./config` | ✅ | ✅ |
| `getMongoClient`, `getDb` | from `./client` | ✅ | ✅ |
| `checkDatabaseHealth` | from `./health` | ✅ | ✅ |
| `setupDatabaseObservability` | from `./observability` | ✅ | ✅ |
| `withRetry` | from `./retry` | ✅ | ✅ |
| `registerShutdownHandlers` | from `./shutdown` | ✅ | ✅ |
| `archiveAuditLogs`, `pruneExpiredDocuments`, `getCollectionStats` | from `./maintenance` | ✅ | ✅ |
| `initializeDatabase` | from `./init` | ✅ | ✅ |
| `COLLECTION_NAMES`, `COLLECTION_ORDER` | from `./constants` | ✅ | ✅ |
| All 11 collection getters | from `./collections` | ✅ | ✅ |
| `ALL_SCHEMAS` | from `./schemas` | ✅ | ✅ |
| `ALL_INDEXES` | from `./indexes` | ✅ | ✅ |
| **Note** | Plan used `export *`; implementation uses named exports (stricter, avoids pollution) | — | ✅ Better |

---

## Design Decision Compliance

| # | Decision | Implemented |
|---|---|---|
| 1 | `MONGODB_URI` read from env | ✅ `config.ts` reads and validates |
| 2 | DB name `cws_auth`, isolated | ✅ Default in `.env`, override via env |
| 3 | `init.ts` — standalone CLI only, never API route, idempotent | ✅ `collMod` for existing, no drops |
| 4 | `src/database/` dedicated directory | ✅ All DB infrastructure here |
| 5 | Single `collections.ts` file | ✅ 11 functions in one file |
| 6 | `IndexDescription` from `'mongodb'` | ✅ No custom type wrappers |
| 7 | `constants.ts` — sole source of collection name strings | ✅ No raw strings anywhere in DB layer |
| 8 | `devices` collection (11th) | ✅ Full schema + 4 indexes |
| 9 | `avatar` object on `users.profile` | ✅ `url`, `source`, `originalUrl`, `updatedAt` |
| 10 | Extended device fingerprint with hashes | ✅ canvas/WebGL/audio/fonts SHA-256 + stability score |
| 11 | `observability.ts` — command monitoring + slow queries | ✅ Driver-level events, JSON logs |
| 12 | `retry.ts` — exponential backoff + jitter | ✅ All 6 retryable error types |
| 13 | `shutdown.ts` — SIGTERM/SIGINT graceful close | ✅ + Next.js instrumentation hook |
| 14 | `maintenance.ts` — archival + prune + stats | ✅ All 3 functions |
| 15 | `lockExpiresAt` on `login_attempts` | ✅ In schema + type |

---

## File Count Verification

| Layer | Expected Files | Actual Files | Status |
|---|---|---|---|
| `src/types/auth/` | 13 | 13 | ✅ |
| `src/database/schemas/` | 12 | 12 | ✅ |
| `src/database/indexes/` | 12 | 12 | ✅ |
| `src/database/` (root) | 11 | 11 | ✅ |
| `scripts/` | 1 | 1 | ✅ |
| Config files modified | 2 (`.env`, `package.json`) | 2 | ✅ |
| New config files | 1 (`.env.example`) | 1 | ✅ |
| Next.js integration | `src/instrumentation.ts` | ✅ Created | ✅ |
| **Grand total** | **52 new + 2 modified** | **52 new + 2 modified** | **✅** |

---

## Issues Found & Resolved

| Issue | Severity | Resolution |
|---|---|---|
| `src/instrumentation.ts` missing | Medium — shutdown handlers not registered in Next.js server | ✅ Created with `register()` hook |
| `comment:` property in `IndexDescription` objects | Compile error — not a valid driver field | ✅ Converted to JS comments |
| `event.reply?.cursor` type mismatch in observability | TypeScript error | ✅ Fixed with safe type cast |
| `MongoServerError.code` type (`string \| number`) passed to `Set.has(number)` | TypeScript error | ✅ Narrowed with `typeof` guard |
| `pnpm` build script policy blocks `esbuild` (pre-commit failure) | Pre-commit hook fails on `git commit` | ✅ `pnpm approve-builds --all` + `pnpm-workspace.yaml` `allowBuilds: esbuild: true` |

---

## Verification Commands

```bash
# Static type check (must return 0 errors)
./node_modules/.bin/tsc --noEmit

# Config validation (must throw DatabaseConfigError)
./node_modules/.bin/tsx -e "import('@/database/config').then(m => m.getDatabaseConfig())"

# Production build
pnpm build

# Database initialization (requires MONGODB_URI in .env)
pnpm db:init
```

---

*Report generated: 2026-07-12 — all checks passing.*
