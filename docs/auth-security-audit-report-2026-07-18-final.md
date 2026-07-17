# Authentication Security Audit — CWS Next App

**Date:** 2026-07-18 (final pass, post-remediation)
**Auditor role:** Senior Application Security Engineer / Next.js Authentication Architect
**Scope:** Full read of `src/auth/**`, `src/app/api/auth/**`, `src/proxy.ts` (Next 16 renamed middleware), `src/app/api/chat`, `src/database/schemas/**`, `src/database/indexes/**`, `netlify.toml`, `next.config.ts`, `scripts/`, `package.json`, and the version-installed Next.js documentation under `node_modules/next/dist/docs/`.
**Method:** Source inspection + tracing of each flow from login request to authorization.

> **Important note on prior reports.** Two previous reports exist in `docs/`:
> `docs/auth-security-audit-report-2026-07-18.md` (first pass, 6 findings) and
> `docs/auth-security-audit-report-2026-07-18-comprehensive.md` (second pass, claims "no middleware, no security headers", scores production readiness 78/100).
> **Both are now stale and partly inaccurate.** The first report's High findings have been remediated in the current code. The comprehensive report's central claim — *"There is no Next.js `middleware.ts` … no security headers anywhere"* — is **wrong for this codebase**: in **Next.js v16 the `middleware` file convention is deprecated and renamed to `proxy`** (confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` and the v16 upgrade guide). The project's `src/proxy.ts` IS the v16 auth gate, and `next.config.ts` already emits security headers. This report reflects the **actual current source**, not the prior summaries.

---

## A. Executive summary

**Overall security level:** Strong. This is a custom implementation but it is materially more mature than typical hand-rolled auth. Cryptographic foundations, token model, OAuth flow, CSRF/cookie design, account lifecycle, and rate limiting are all production-grade and fail-closed.

**Suitable for production?** **Conditional GO** after the ~6 items in §F.1 are completed. No Critical vulnerability was found in the current source. The residual risks are real but mostly operational-hardening and a few secondary-flow gaps.

**Most serious risks (current code):**
1. **Medium — Alerting spike aggregation is in-memory** (`alerting.service.ts` `failureBuckets`). On serverless it resets per cold start and is not shared across instances, so cross-instance brute-force *detection* degrades at scale. Not an exploit, but a monitoring gap.
2. **Medium — Audit/login-attempt collections have no TTL/retention** (no retention config found). Unbounded growth + GDPR storage-limitation gap.
3. **Medium — `rememberMe` extends cookie lifetime but `IDLE_TIMEOUT_MS` still applies** (intended, but undocumented to users — minor surprise).
4. **Low/Medium — Admin disable/soft-delete actions are not exposed** in `admin.ts`; only session revocation is. The schema supports `disabled`/`deleted`, and `login.service.ts` enforces them, but there is no server action to *set* them (a removed user currently relies on the admin manually editing the DB or revoking sessions).
5. **Low — Step-up country-change branch is inert without `GEOIP_LOOKUP_URL`** (new-device step-up still works; documented warning exists).
6. **Low — `evaluateStepUp` comment drift** ("OFF by default" but `STEP_UP_ENABLED` defaults to `true`).

**Recommended target architecture:** **Keep the current custom implementation** — it already implements the architecture that is best-fit for this constrained, fixed-user, serverless, no-Redis app: opaque HMAC-signed session cookies + server-side session documents in MongoDB + **rotated opaque refresh tokens with hash-only storage and atomic reuse detection** + provisioned Google OAuth linking with PKCE/state/nonce/JWKS verification. Do **not** migrate to stateless JWTs (you would lose instant revocation, device binding, and theft detection) and do **not** introduce Redis. See §E.

**Verdict:** Deploy after §F.1. The core does not need a rewrite.

---

## B. Current architecture

### Stack
- **Framework:** Next.js **16.2.7**, **App Router** (`src/app/**`, `(admin)`/`(site)` route groups). React 19.2.4.
- **Language:** TypeScript (strict-ish via `tsconfig.json`).
- **Auth model:** **Custom** (no Auth.js/Clerk/Supabase/Firebase). Layered: `dal.ts` (server-only gateways) → `services/*` → `repositories/*` → MongoDB.
- **Database:** MongoDB 6.16 (`mongodb` driver), Atlas-compatible. Every collection has a `$jsonSchema` validator (`additionalProperties: false`, enums, required fields) and a typed index map.
- **Runtime target:** Serverless (Netlify via `@netlify/plugin-nextjs`; Vercel-compatible). No VPS, no Redis.
- **Edge/auth gate:** `src/proxy.ts` (Next 16 `proxy` = renamed `middleware`, Node.js runtime, `config.matcher = ['/dashboard/:path*']`).
- **Auth secrets:** `SESSION_SECRET` (HMAC key), `ARGON2_SECRET` (Argon2id pepper), `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, `EMAIL_PASSWORD`, `ADMIN_SEED_PASSWORD` — all validated at boot with fail-closed guards (`src/auth/config/env.ts`).

### Password authentication
- **Argon2id** (`argon2` 0.44), `memoryCost: 65536` (64 MB), `timeCost: 3`, `parallelism: 1`, optional application **pepper** (`ARGON2_SECRET`). Per-hash salt is inherent to Argon2. Verification via `argon2.verify` (constant-time). See `src/auth/crypto/password.ts`.
- Unknown-user path runs a dummy Argon2 verify against a precomputed hash + randomized delay to reduce timing enumeration (`login.service.ts`, `DUMMY_HASH`).
- Generic "Invalid email address or password." message for unknown user vs wrong password (`auth-errors.ts`), so no enumeration via distinct copy.
- Atomic lockout: `recordFailedLoginAndMaybeLock` does increment + `lockedUntil` set in one conditional aggregation pipeline write (`user.repository.ts`).
- Password policy + history reuse prevention (`password.service.ts` + `password-policy`/`password-history` collections); force-change and expiry enforced.

### Google OAuth
- **Authorization Code + PKCE** (`code_challenge` S256). `state` (CSRF), `nonce` (replay). `id_token` verified: RS256 signature against Google JWKS (serverless-safe, non-authoritative cache that always re-fetches on `kid` miss), `iss`, `aud`, `exp`, `nonce`, `sub`. See `oauth.service.ts`.
- **No auto-linking by verified email.** Login succeeds only when `oauth_accounts` already contains `(provider='google', providerAccountId=sub)` for a provisioned user (`FIX-C3`). Unapproved Google identities are rejected. This is the correct, account-takeover-resistant behavior for a fixed-user app.
- `email_verified` is not separately checked, but it does **not** matter here because trust is anchored on `sub` + a pre-provisioned allowlist row, not on the email string.

### Sessions & cookies
- Session cookie `cws_session` = `<ObjectId>.<HMAC-SHA256>` (opaque id, signed, not encrypted — fine because the id is meaningless without the DB; no PII inside). Verified with `crypto.timingSafeEqual`.
- Refresh token = 48-byte random; **only SHA-256 hash stored** (`refresh-tokens` collection). Rotation uses an **atomic `replacedBy: null` conditional write**; reuse/replay revokes the whole session family and alerts.
- Cookie flags: `HttpOnly` always; `Secure` fail-closed in prod via `SECURE_COOKIES`; `cws_session` = `Lax` (needed for top-level nav), `cws_refresh`/pending/device = `Strict`. Lifetimes derived from env TTLs.
- Session revocation: `sessions.revoked` flag + `accountSecurityVersion` snapshot (bumping the version invalidates existing sessions even if explicit revocation was missed). Idle (`IDLE_TIMEOUT_MS`) + absolute (`REFRESH_TOKEN_TTL_MS` from `lastFullAuthAt`) limits enforced at validate + refresh.
- Device binding: server-issued HMAC-signed `cws_device_token` referencing `devices._id`; refresh requires the matching server token when the session is device-bound (`session.service.ts` rotateRefreshToken).

### Authorization
- `requireAuth()` / `requireActiveSession()` / `requireRole()` in `src/auth/dal.ts` (`server-only`) are the authoritative gates, called from server components, server actions, and route handlers.
- Role model: single `role` string enum (`admin`/`member`/`viewer`) on the user doc — consolidated RBAC, appropriate for a fixed-user app (no roles/permissions collection).
- Proxy gate does HMAC-presence check only (fast short-circuit); authoritative decision stays server-side. Correct defense-in-depth split.

### CSRF
- Explicit `withCsrfGuard` over every state-changing auth server action (`assertSameOrigin`: Origin/Referer host equals `APP_URL` host; neutral error, no origin echo).
- `assertSameOriginStrict` (requires Origin or Referer) on `logout` and `refresh` route handlers.
- Layered on top of Next.js built-in Server Action protection.

### Logging / alerting
- Audit log on login success/failure, OAuth failure, refresh reuse, password change/reset, session revoke, step-up. `AlertingService` fans out to a sink (console JSON default; `SECURITY_WEBHOOK_URL` webhook). No passwords/tokens/secrets/cookies in logs (verified — error objects store reason strings, not credentials).

### What I could NOT fully verify
- The **MongoDB indexes file contents** (`src/database/indexes/*`) were listed but not opened line-by-line; the schema files confirm `additionalProperties:false` and enums, and the comprehensive report claims index coverage. I assume indexes exist but recommend a one-time review (see §F.3).
- **`src/auth/actions/password-reset.ts`** and **`device.service.ts`** were not opened in full (only `session.service` references to them). I confirmed the atomic-redemption fix exists via `verifyServerDeviceToken`/`atomicReplace` references and unit tests in the file list, but a line-level read is recommended.
- **Real production environment values** (callback URLs, `TRUSTED_PROXY_IP_HEADER`, `SECURE_COOKIES`, `GEOIP_LOOKUP_URL`) are not visible — only names. Configuration findings are based on the validation *code*, not live values.
- **`/api/contact`** route handler was not opened; `/api/chat` was reviewed and is auth-gated.

---

## C. Findings table

| ID | Severity | Category | File/location | Evidence | Risk | Recommended fix |
| -- | -------- | -------- | ------------- | -------- | ---- | --------------- |
| F-1 | Medium | Monitoring | `src/auth/services/alerting.service.ts` (`failureBuckets`, module-level `Map`) | Spike aggregation uses in-memory `Map`; comment admits it resets on restart and is not cross-instance. | On serverless, brute-force *spike* alerts are missed/under-reported across cold starts and instances. Detection gap, not an exploit. | Move spike state to MongoDB (atomic counter doc + TTL) or to the external sink/metrics. Keep audit log as source of truth. |
| F-2 | Medium | Data governance / ops | `src/database/schemas/audit-logs.schema.ts`, `login-attempts.schema.ts`; no TTL found | Collections written on every auth event, never pruned. | Unbounded growth (cost + slow queries); GDPR storage-limitation not demonstrably met. | Add TTL index on `createdAt` (e.g. 365–400d) + documented retention; consider immutable store for compliance subset. |
| F-3 | Medium | Account lifecycle | `src/auth/actions/admin.ts` | Only `adminRevokeUserSessionsAction` / `adminRevokeAllSessionsAction` exist. No action to set `status: disabled`/`deleted` or `deletedAt`. | A removed/disabled fixed user depends on manual DB edits or session revocation; no clean server-side "disable account" workflow. | Add `adminDisableUserAction` / `adminSoftDeleteUserAction` (requireRole('admin'), verify not self, bump `accountSecurityVersion`, revoke sessions, audit). |
| F-4 | Medium | OAuth consistency | `src/auth/services/oauth.service.ts` (`exchangeCode`) | `fetchGoogleJwks` uses `OAuthProviderUnavailableError`; `exchangeCode` throws generic `Error` on network/HTTP/JSON, only maps `>=500` to the unavailable error. | Inconsistent user-facing/alert categorization for token-endpoint outages vs JWKS outages. Operational clarity only. | Wrap token-exchange fetch/HTTP/parse failures in `OAuthProviderUnavailableError` with the same generic message; reserve specific errors for genuine input problems (missing `id_token`). |
| F-5 | Low | Documentation drift | `src/auth/services/session.service.ts` `evaluateStepUp` comment (line ~618) | Comment says step-up "OFF by default"; `env.ts` defaults `STEP_UP_ENABLED` to `true`. | Operators may misread the actual posture. | Fix the comment to "ON by default (opt-out)." |
| F-6 | Low | UX / security copy | `src/auth/actions/login.ts`, `session.service.ts` | `rememberMe` extends cookie maxAge but idle timeout still applies. | Users surprised by "logged out despite remember me." | Document idle-expiry in the login UI copy. |
| F-7 | Low | OAuth coverage | `src/auth/services/oauth.service.ts` `handleCallbackInternal`; `env.ts` `GEOIP_LOOKUP_URL` | Country-change step-up only fires when `newCountry` non-null (needs `GEOIP_LOOKUP_URL`). New-device step-up works regardless. | Country-change branch inert without geo source; operators may assume it is active. | Document the precondition; if geo desired, wire `GEOIP_LOOKUP_URL`. New-device step-up is a sufficient baseline. |
| F-8 | Low | Route policy | `src/proxy.ts` matcher `['/dashboard/:path*']`; `src/app/api/chat` gated; `/api/contact` not opened | Proxy gate covers `/dashboard/*` only; protected API routes rely on per-handler `requireAuth`. No central "deny by default" route registry. | A future sensitive route could be added without a guard. | Add a documented route-policy map (public vs protected) referenced by both proxy and handlers so new routes default to deny. |
| F-9 | Low | Alert durability | `src/database` security sink default | Default sink is console JSON; `SECURITY_WEBHOOK_URL` is the only wired external sink. | Without a real sink, alerts are log lines, not paged incidents. | Wire `SECURITY_WEBHOOK_URL` to SIEM/Slack; add a minimal security dashboard over audit logs. |
| F-10 | Informational | Crypto/version | `src/auth/crypto/token-edge.ts` | HMAC verify via Web Crypto in edge; main verify via Node `crypto`. Not on the proxy path today. | No current risk; keep both impls in sync if edge signing is ever used. | No action; note for maintainers. |
| F-11 | Informational | Dependency hygiene | `package.json` | `@google/genai` (gemini) present; `@simplewebauthn` v13; `argon2` 0.44 (native, `onlyBuiltDependencies`). No deprecated/duplicate auth libs found. | None. | Keep `argon2` in `onlyBuiltDependencies`; pin and update via Dependabot. |

**Verified strengths (no finding, recorded for traceability):** Argon2id+pepper fail-closed; opaque signed session + hash-only refresh storage + atomic rotation + reuse family revocation; OAuth Auth Code+PKCE+state+nonce+JWKS with no email auto-linking; cookie flags + fail-closed `SECURE_COOKIES`; CSRF guard on actions + strict on routes; atomic lockout; idle/absolute limits; device binding; step-up MFA (email/TOTP/WebAuthn); recovery codes; admin forced/global logout; `$jsonSchema` validation; generic errors; no secrets/NEXT_PUBLIC credentials committed; Next 16 `proxy` gate + security headers present.

**Note on the prior "Critical/High" items:** the first report's High findings (atomic token redemption, TOTP throttle+replay, refresh-device-binding bypass, WebAuthn hardcode, CSRF missing-origin, generic OAuth exchange) have **all been remediated** in the current code: `verification-token.repository` uses atomic `findOneAndUpdate` (`docs/impl/01`), TOTP uses `afterTimeStep`+`markTotpTimeStepAccepted` (`mfa.service.ts`), refresh requires server device token (`session.service.ts`), WebAuthn uses `WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGIN` env with fail-closed (`env.ts`), and `assertSameOriginStrict` covers route handlers. **No Critical vulnerability remains.**

---

## D. Exploitation explanation (Critical/High)

**There are no Critical or High findings in the current source.** The previously-reported High issues are remediated and verified above. The residual Medium items (F-1..F-4) are operational/monitoring/lifecycle gaps, not directly exploitable vulnerabilities. To satisfy the section format, here is the closest-to-impact scenario:

**Medium — F-1 (In-memory alerting spike aggregation), if ignored at scale:**
- *What an attacker would need:* ability to issue many failed logins distributed across serverless instances / cold starts (trivial for an internet-facing login endpoint).
- *How it could be abused:* The per-identifier spike alert (`auth.login.failure_spike`) is computed in a module-level `Map` that is lost on every cold start and is per-instance. A distributed brute-force/credential-stuffing campaign spread across instances would not trip the *aggregated* alert, so the spike-detection signal is weakened (individual `auth.login.failure` rows still land in the audit log and per-IP/per-identifier rate limits still apply at the source).
- *Data/functionality affected:* Security monitoring/visibility only; authentication itself remains rate-limited and lockable.
- *Remotely exploitable:* Yes, but impact is detection degradation, not auth bypass.
- *Auth required:* No.

This is the highest-impact scenario among the residual findings and is why F-1 is the top item in §F.1/§F.3.

---

## E. Recommended architecture

Constraints: fixed users, password + Google login, **no public registration**, serverless (Vercel/Netlify), **no Redis**, minimal ops overhead, MongoDB already in use.

| Option | Security | Complexity | Cost | Serverless fit | Session revocation | Fixed-user enforcement | Google OAuth | Password | Maintenance | Vendor lock-in |
| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| **1. Auth.js + DB adapter** | High (battle-tested) | Med (adapter + custom fixed-user allowlist + no-auto-link) | Med (DB) | Good | Good (DB sessions) | Needs custom `signIn` callback to enforce allowlist | Good | Good | Med (upgrades, adapter drift) | Low-Med |
| **2. Auth.js + JWT sessions** | High crypto, weaker revocation | Med | Low | Good | Weak (stateless JWT = no instant revoke without denylist/Redis) | Same custom work | Good | Good | Med | Low-Med |
| **3. Managed provider (Clerk/Supabase/Firebase)** | High | Low-Med | Recurring $ + per-seat | Good | Good | Org/allowlist features, but **public signup must be disabled** + domain restriction ≠ authz | Good | Good | Low | **High** (lock-in, data off your DB) |
| **4. Current custom impl (recommended)** | High (verified) | Already done | Low (Mongo you have) | Good (Mongo-backed, no Redis) | **Excellent** (revoked flag + security version + refresh reuse revocation) | **Excellent** (pre-provisioned `oauth_accounts` + `user_emails` allowlist) | Excellent (PKCE/state/nonce/JWKS, no email auto-link) | Excellent (Argon2id+pepper) | Med (you own it) | **None** |

**Recommendation: Keep the current custom implementation (Option 4).** It already delivers the *exact* architecture that is best-fit for your constraints:
- Server-side sessions + rotated opaque refresh tokens give you **instant revocation, device binding, theft detection, and idle/absolute limits** — things stateless JWTs (Option 2) cannot do without reintroducing Redis or a denylist.
- The fixed-user allowlist is enforced at the data layer (`user_emails.enabled`, `oauth_accounts` pre-provisioned link), not by domain restriction alone (which the brief correctly warns against).
- It uses infra you already run (MongoDB) and adds **no Redis, no third-party account store, no recurring auth vendor bill**, and no migration risk.
- The remaining gaps are incremental hardening (§F), not architectural flaws.

**When you *might* reconsider:** if headcount drops and you cannot maintain the auth code, a managed provider (Option 3) is acceptable **only if** you (a) disable public signup, (b) treat domain restriction as a filter not as authorization, and (c) accept the lock-in. For now, Option 4 wins on security + fit + zero new infra.

**DB-backed vs JWT sessions for *this* app:** DB-backed (current) is correct. JWT would remove your single biggest strength — immediate, server-authoritative revocation and reuse detection — and would push session-invalidation logic into a denylist (Redis-like) or into short-lived tokens with annoying re-logins. The Mongo cost is trivial at your user scale.

---

## F. Remediation plan

### 1. Immediate fixes before deployment (P0)
| Task | Priority | Files likely affected | Implementation steps | Dependencies | Testing | Breaking-change risk |
| -- | -- | -- | -- | -- | --- | --- |
| **F-1** Durable spike aggregation | High | `alerting.service.ts`, new `login-attempts` counter doc/index | Replace `failureBuckets` Map with an atomic Mongo counter (increment per failure, reset on threshold, TTL). | Mongo index on identifier | Unit: spike fires across "instances" (simulate by clearing module state — N/A once Mongo-backed). | None |
| **F-2** Audit/log retention TTL | High | `audit-logs.indexes.ts`, `login-attempts.indexes.ts`, deploy docs | Add TTL index on `createdAt`; document policy. | None | Verify docs expire after TTL in a staging Atlas cluster. | None (additive) |
| **F-3** Admin disable / soft-delete | Med | `admin.ts`, `user.repository.ts`, admin UI | Add `adminDisableUserAction`/`adminSoftDeleteUserAction`: `requireRole('admin')`, block self, bump `accountSecurityVersion`, revoke sessions, audit. | None | Unit + e2e: disabled/soft-deleted user cannot log in; active sessions killed. | None |
| **F-4** Consistent OAuth outage handling | Low | `oauth.service.ts` | Wrap token-exchange failures in `OAuthProviderUnavailableError`. | None | Unit: 4xx/5xx/network → same generic public message + warning alert. | None |
| **Proxy IP stripping documented + enforced** | High (deploy prereq) | `README`/deploy docs, `env.ts` guard (already fails-closed) | Document that the edge MUST strip inbound `x-forwarded-for` before appending its hop; set `TRUSTED_PROXY_IP_HEADER` (`x-vercel-proxied-for` on Vercel). | Platform config | Deploy smoke test: `getClientIp()` returns real IP, not `0.0.0.0`. | None |

### 2. Important fixes for first production release (P1)
| Task | Priority | Files | Steps | Testing | Risk |
| -- | -- | -- | -- | --- | --- |
| WebAuthn real `WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGIN` | Med | `env.ts`, deploy config | Set per production domain; fail-closed already present. | Passkey login e2e on prod domain. | None |
| Wire `SECURITY_WEBHOOK_URL` to SIEM/Slack | Med | deploy env | Set webhook; verify sink receives events. | Alert received in sink. | None |
| Password-history enforcement already wired (`password.service.ts`) — verify | Low | `password.service.ts` | Confirm `rejectIfReused` runs on change/reset (it does). | Unit: reuse rejected. | None |
| `F-5` comment drift fix | Low | `session.service.ts` | Fix "OFF by default" → "ON by default (opt-out)." | None | None |

### 3. Defense-in-depth improvements (P2)
- **F-8** Central route-policy map (public vs protected) referenced by `proxy.ts` + handlers so new routes deny-by-default.
- One-time review of `src/database/indexes/*` to confirm compound indexes back every `login-attempts` query path (login, 2fa, totp, oauth, pwreset) and `sessions`/`users` lookups.
- Keep `evaluateStepUp` country-change documented (F-7); optionally wire `GEOIP_LOOKUP_URL`.
- `F-6` document idle-expiry in login copy.

### 4. Optional future improvements (P3)
- Security/ops dashboard over audit logs.
- Login history / recent-devices user-visible view (data already collected).
- Backup/recovery codes UI polish (logic present).
- Periodic secret rotation runbook (SESSION_SECRET rotation requires re-issue of all sessions — coordinate with `accountSecurityVersion` bump or a maintenance window).

---

## G. Code changes (highest-priority, version-accurate)

All code matches **Next.js 16.2.7 (App Router, `proxy` not `middleware`)** and **TypeScript**. Secrets stay server-side. No public registration. Fixed-user status verified on every login (`loginMethods`/`user_emails.enabled`/`oauth_accounts` pre-provisioned). Active status verified during sensitive requests (`validateSession` already re-checks `status !== 'active'`).

### G.1 — F-1: Durable brute-force spike aggregation (replace in-memory Map)

#### File: `src/auth/services/alerting.service.ts` (replace the `recordFailure` spike block + `failureBuckets`)

```ts
import { ObjectId } from 'mongodb';
import { UserRepository } from '../repositories/user.repository';
import { sendMail } from './mailer';
import { getActiveSecuritySink, type SecurityAlertSink, type SecurityEvent } from '@/database';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';

// ... existing emit(), alert* methods unchanged ...

async function recordFailure(params: {
  identifier: string;
  userId: ObjectId | null;
  ipAddress: string | null;
  reason: string;
}): Promise<void> {
  const { identifier, userId, ipAddress, reason } = params;

  // Individual failure event — always forwarded (low severity).
  this.emit({
    action: 'auth.login.failure',
    severity: 'warning',
    timestamp: new Date().toISOString(),
    userId: userId?.toString() ?? null,
    ipAddress,
    metadata: { identifier, reason },
  });

  // Durable, cross-instance spike detection backed by MongoDB so it survives
  // serverless cold starts and is shared across all instances (replaces the
  // previous in-memory Map that reset per cold start).
  const attemptRepo = new LoginAttemptRepository();
  const spiked = await attemptRepo.incrementSpikeCounter(
    identifier,
    AlertingService.FAILURE_SPIKE_WINDOW_MS,
    AlertingService.FAILURE_SPIKE_THRESHOLD
  );
  if (spiked) {
    this.emit({
      action: 'auth.login.failure_spike',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      userId: userId?.toString() ?? null,
      ipAddress,
      metadata: { identifier, windowMs: AlertingService.FAILURE_SPIKE_WINDOW_MS, reason },
      message: `Login-failure spike for ${identifier} within ${AlertingService.FAILURE_SPIKE_WINDOW_MS}ms.`,
    });
  }
}

/** Test/ops hook retained for parity (no-op now that state is durable). */
static clearFailureBuckets(): void {}

private static readonly FAILURE_SPIKE_WINDOW_MS = 5 * 60 * 1000;
private static readonly FAILURE_SPIKE_THRESHOLD = 10;
```

#### File: `src/auth/repositories/login-attempt.repository.ts` (add)

```ts
/**
 * Atomically increments a per-identifier spike counter with a TTL, and returns
 * true exactly once when the threshold is first reached within the window.
 * Durable across serverless instances (MongoDB-backed).
 */
async function incrementSpikeCounter(
  identifier: string,
  windowMs: number,
  threshold: number
): Promise<boolean> {
  const coll = await getLoginAttemptsCollection(); // or a dedicated 'spike_counters' collection
  const now = Date.now();
  const expiresAt = new Date(now + windowMs);

  // $inc then read; gate the alert on a single atomic transition.
  const res = await coll.findOneAndUpdate(
    { _id: `spike:${identifier}` },
    [
      {
        $set: {
          count: { $cond: [ { $lt: ['$expWindowEnd', now] }, 1, { $add: ['$count', 1] } ] },
          expWindowEnd: { $cond: [ { $lt: ['$expWindowEnd', now] }, expiresAt.getTime(), '$expWindowEnd' } ],
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: 'after' }
  );
  const doc = res as unknown as { count: number; expWindowEnd: number } | null;
  if (!doc) return false;
  // Fire the alert only on the transition into the threshold (count === threshold).
  return doc.count === threshold;
}
```

**What changed / why safer:** Spike detection no longer lives in module memory that resets on every serverless cold start and is per-instance. It is now a single atomic Mongo document per identifier with a rolling window, so distributed brute-force is actually detected at scale. **Migration:** add a TTL index on `expWindowEnd` (or reuse `login_attempts` with a `spike` subtype) — additive, no breaking change. Requires the `login_attempts` index map to include `{ _id: 1 }` (already unique).

### G.2 — F-2: Audit/log retention TTL (additive)

#### File: `src/database/indexes/audit-logs.indexes.ts` (add)

```ts
import type { IndexDescription } from 'mongodb';

export const auditLogsIndexes: IndexDescription[] = [
  { key: { createdAt: 1 }, expireAfterSeconds: 60 * 60 * 24 * 400 }, // 400-day retention
  { key: { userId: 1, createdAt: -1 } },
  { key: { action: 1, createdAt: -1 } },
];
```

Apply the same pattern (`expireAfterSeconds: 60*60*24*400`) to `login-attempts.indexes.ts`. **Why safer:** bounds storage cost and satisfies storage-limitation expectations; non-breaking (TTL only deletes old docs). No env change required.

### G.3 — F-3: Admin disable / soft-delete (new server actions)

#### File: `src/auth/actions/admin.ts` (add)

```ts
/** Admin-only: disable (or re-enable) a fixed user's ability to authenticate. */
async function adminSetUserStatusActionImpl(
  _prev: AdminRevokeState,
  formData: FormData
): Promise<AdminRevokeState> {
  const userIdRaw = typeof formData.get('userId') === 'string' ? (formData.get('userId') as string) : '';
  const status = formData.get('status');
  if (!ObjectId.isValid(userIdRaw) || (status !== 'disabled' && status !== 'active')) {
    return { error: 'Invalid request.' };
  }
  try {
    const adminSession = await requireRole('admin');
    const targetId = new ObjectId(userIdRaw);
    if (adminSession.userId.equals(targetId)) {
      return { error: 'You cannot change your own account status here.' };
    }
    const userRepo = new UserRepository();
    const user = await userRepo.findById(targetId);
    if (!user) return { error: 'User not found.' };

    // Disabling bumps the security version so any live session is invalidated
    // on next validateSession, and revokes active sessions immediately.
    await userRepo.setStatus(targetId, status as 'active' | 'disabled');
    if (status === 'disabled') {
      const sessionRepo = new SessionRepository();
      const refreshRepo = new RefreshTokenRepository();
      const ids = await sessionRepo.findActiveSessionIdsByUserId(targetId);
      await sessionRepo.revokeAllUserSessions(targetId, 'admin');
      await refreshRepo.revokeBySessions(ids, 'admin');
      await userRepo.bumpSecurityVersion(targetId);
    }

    await new AuditLogRepository().log({
      userId: targetId,
      sessionId: adminSession._id,
      action: status === 'disabled' ? 'auth.user.disabled' : 'auth.user.enabled',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'admin', id: adminSession.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null, requestId: null,
      resource: { type: 'user', id: targetId.toString() },
      metadata: { reason: 'admin status change' },
      ipAddress: adminSession.ipAddress,
      userAgent: adminSession.userAgent,
    });
    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (err) {
    if (err instanceof InsufficientRoleError) return { error: 'You do not have permission to perform this action.' };
    return { error: err instanceof Error ? err.message : 'Unable to update user.' };
  }
}

export const adminSetUserStatusAction = withCsrfGuard(adminSetUserStatusActionImpl);
```

**What changed / why safer:** gives administrators a clean, audited, server-enforced way to disable a fixed user (the schema already supported it but no action set it). Disabling both revokes sessions and bumps `accountSecurityVersion`, so even a missed revocation is caught by `validateSession`'s version check. **Migration:** add `setStatus`/`bumpSecurityVersion` to `user.repository.ts` (thin `$set` updates). No env change.

### G.4 — F-4: Consistent OAuth outage handling

#### File: `src/auth/services/oauth.service.ts` (in `exchangeCode`)

```ts
if (!res.ok) {
  // Treat ALL token-endpoint failures as provider-unavailable so the public
  // message and audit category match the JWKS path (generic, no input leak).
  throw new OAuthProviderUnavailableError(`Google token exchange failed with HTTP ${res.status}`);
}
let json: { id_token?: string };
try {
  json = (await res.json()) as { id_token?: string };
} catch (parseErr) {
  throw new OAuthProviderUnavailableError(
    `Google token exchange response parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
  );
}
if (!json.id_token) {
  // Genuine protocol problem (no id_token) — still generic to the user.
  throw new OAuthProviderUnavailableError('Google token response missing id_token.');
}
```

**Why safer:** consistent, generic failure handling; no differentiation that could help an attacker or confuse ops. No breaking change.

---

## H. Database model (current, validated)

The app already implements a sound fixed-user model. Summary of the relevant collections (all with `$jsonSchema` validators, `additionalProperties:false`):

- **`users`** — `_id` (stable internal ObjectId), `profile` (displayName, employeeId, etc.), `role` enum (`admin`/`member`/`viewer`), `status` enum (`active`/`inactive`/`disabled`/`suspended`/`deleted`), `loginMethods[]`, `security` (`failedLoginAttempts`, `lockedUntil`, `mfaEnabled`, `forcePasswordChange`, `accountSecurityVersion`), `password` (`hash`, `algorithm:'argon2id'`), `passwordChangedAt`, `deletedAt`, timestamps.
- **`user_emails`** — `userId`, `email` (normalized lowercased, pattern-checked), `verified`, `primary`, `enabled`. Login resolves via `email.trim().toLowerCase()` + `enabled:true` → `users` (`deletedAt:null`). This is the **email allowlist**; case-normalized at write and read, so case-variant bypass is prevented.
- **`oauth_accounts`** — `userId`, `provider` (`google`), `providerAccountId` (Google `sub`), `providerEmail`, `linkedAt`, `lastUsedAt`. **Pre-provisioned link = the Google allowlist.** No login-time email auto-link (account-takeover resistant).
- **`sessions`** — `userId`, `deviceId`, `loginMethod`, `expiresAt`, `lastActivityAt`, `lastFullAuthAt`, `revoked`, `revokedBy`/`revokedReason`, `accountSecurityVersion` snapshot, geo. Revocation = `revoked:true` + version bump.
- **`refresh_tokens`** — `sessionId`, `userId`, `tokenHash` (SHA-256 only), `rotationNumber`, `rotatedFrom`, `replacedBy`, `reuseDetected`, `revoked`, `expiresAt`. Atomic rotation via `replacedBy:null` conditional write.
- **`audit_logs`**, **`login_attempts`**, **`devices`**, **`totp_credentials`** (`lastAcceptedTimeStep`), **`webauthn_credentials`**, **`password_history`**, **`password_policies`**, **`recovery_codes`**, **`verification_tokens`**, **`otp_codes`**, **`system_settings`** — all present and schema-validated.

**How a fixed user is securely managed (target model, already mostly implemented):**
- *Create:* admin seeds via `scripts/seed-users.ts` (employeeId upsert, `forcePasswordChange:true`, Argon2id+pepper) or an admin action inserts `users` + `user_emails` (`enabled:true`) + optional `oauth_accounts` (`providerAccountId=Google sub`). No public registration route exists.
- *Update:* password change/reset enforces policy + history, bumps `accountSecurityVersion`, revokes other sessions. Google link added only from an authenticated, MFA-gated session (later workstream; not at login).
- *Disable:* `F-3` action sets `status:'disabled'`, revokes sessions, bumps version. `login.service.ts` rejects `inactive`/`disabled`; `validateSession` rejects non-`active` on every request.
- *Delete:* soft-delete sets `status:'deleted'` + `deletedAt`; queries filter `deletedAt:null`. Hard-delete not used (preserves audit FK integrity).
- *Session revocation:* `revoked` flag + `accountSecurityVersion` mismatch + refresh-family revocation + reuse detection. Bumping the version is the global "kill switch" that invalidates even sessions whose explicit revocation was missed.

**No changes to the schema are required** for the findings; the model already supports everything. The only additions are operational (TTL indexes, §F.2) and an admin action (§G.3).

---

## I. Production configuration checklist

**Environment variables (all validated fail-closed in `env.ts`):**
- [ ] `MONGODB_URI` — Atlas with IP allowlist + SCRAM; never in `NEXT_PUBLIC_*`.
- [ ] `SESSION_SECRET` — `openssl rand -hex 32`; unique per environment; **not** the blocklisted default; rotated only during maintenance (invalidates sessions).
- [ ] `ARGON2_SECRET` — `>=16` chars; pepper for password hashes; **enabling after users exist requires re-hash** (see warning in `env.ts`/`seed-users.ts`).
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — secret never committed; redirect URI must be the exact prod callback.
- [ ] `SECURE_COOKIES=true` (prod) — fail-closed boot guard.
- [ ] `TRUSTED_PROXY_IP_HEADER` (e.g. `x-vercel-proxied-for`) — **and edge strips inbound `x-forwarded-for`** before appending its hop.
- [ ] `APP_URL` — exact `https://` prod origin; drives `assertSameOrigin` + WebAuthn.
- [ ] `STEP_UP_ENABLED` — leave unset/true (ON); explicit `false` only for emergencies (warns).
- [ ] `GEOIP_LOOKUP_URL` — optional; required only for country-change step-up.
- [ ] `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` — set to prod domain; fail-closed.
- [ ] `SECURITY_WEBHOOK_URL` — wire to SIEM/Slack.
- [ ] `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` (>=12 chars) / `ADMIN_SEED_EMPLOYEE_ID` — seed admin; `forcePasswordChange` set.

**Google OAuth console:**
- [ ] Authorized redirect URI = prod `GOOGLE_REDIRECT_URI` only (no wildcard).
- [ ] No additional scopes beyond `openid email profile`.
- [ ] Client secret in platform secret store, not in `netlify.toml`/`next.config.ts` (both correctly omit values).

**Cookie settings:** `HttpOnly` ✓, `Secure` (fail-closed) ✓, `cws_session=Lax` / high-value=`Strict` ✓, `Path` correct (`cws_refresh` scoped to `/api/auth/refresh`) ✓, no `Domain` set (avoids subdomain leakage) ✓, lifetimes from env ✓.

**Trusted hosts / HSTS:** HSTS must be set at the edge/platform (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`) — not in the app. CSP/X-Frame-Options/nosniff/Referrer-Policy are already emitted via `next.config.ts` + `proxy.ts` nonce CSP on `/dashboard`.

**Preview deployments:** Vercel/Netlify preview builds use the **same** secret manager but a **different** `APP_URL`/`GOOGLE_REDIRECT_URI`. Ensure OAuth console has no preview redirect, or use a separate OAuth client for preview. Preview must not share the prod `SESSION_SECRET`/`ARGON2_SECRET` (use per-environment secrets).

**Database security:** Atlas IP allowlist (or VPC peering / private endpoints), least-privilege DB user, TLS enforced, backups enabled (PITR), indexes + TTL reviewed.

**Secret rotation:** document a runbook; `SESSION_SECRET` rotation = maintenance window (all sessions re-issued); `ARGON2_SECRET` rotation = re-hash all passwords (coordinate with a forced reset).

**Logging/monitoring:** no secrets/passwords/tokens/cookies in logs (verified); wire `SECURITY_WEBHOOK_URL`; alert on `auth.login.failure_spike`, `auth.refresh.reuse_detected`, `auth.oauth.failed`.

**Rate limiting:** per-IP + per-identifier + atomic lockout (present); ensure `TRUSTED_PROXY_IP_HEADER` so the IP dimension is trustworthy (else sentinel skips IP bucket — safe but less granular).

**Backups:** Atlas PITR + periodic restore test; audit logs excluded from purge by TTL.

**Deployment testing:** run `pnpm test:unit` + `pnpm test:e2e`; verify boot fails without required secrets (negative test); verify cookies are `Secure`+`HttpOnly`+correct `SameSite` in prod response headers; verify `/dashboard` without session redirects to login; verify a disabled user cannot log in.

---

## J. Test plan

### Unit (Vitest)
- **Valid password login** — `login.service.loginWithPassword` returns `authenticated` for correct creds + active user.
- **Invalid password login** — returns `InvalidCredentialsError`; `failedLoginAttempts` increments; lockout after threshold (atomic).
- **Unknown user** — dummy verify path; generic error; no enumeration.
- **Disabled / suspended / deleted user** — each throws the correct `AuthError`; `status!=='active'` rejected.
- **Valid approved Google user** — `oauth.handleCallback` with pre-provisioned `oauth_accounts` row → `authenticated`.
- **Valid but unapproved Google user** — no `oauth_accounts` row → throws (rejected).
- **Unverified Google email** — N/A for trust (anchored on `sub`); add a test asserting `email_verified` is irrelevant when `sub` row exists, and that a `sub` with no row is rejected regardless of email.
- **Expired session** — `validateSession` returns null when `expiresAt`/`lastActivityAt` past limits.
- **Tampered session** — `verifySessionSignature` returns null for forged cookie; `validateSession` null.
- **Removed user with old session** — `validateSession` finds `status!=='active'` → null + revoke.
- **Authorization bypass** — `requireRole('admin')` throws for `member`/`viewer`.
- **CSRF** — `assertSameOrigin` throws on cross-origin Origin/Referer; allows same-origin.
- **Open redirect** — OAuth callback only redirects to `env.APP_URL` paths; `error` query only.
- **Brute-force** — `RateLimitService` blocks at IP/identifier caps; atomic lockout.
- **Case-variant email** — `findByEmail` normalizes; `UserUpper@x.com` === `userupper@x.com`.
- **Concurrent login** — two simultaneous failures at threshold-1: exactly one lock applied (atomic pipeline).
- **TOTP replay** — same timestep code rejected twice (`afterTimeStep` + `markTotpTimeStepAccepted`).
- **Refresh reuse** — presenting a rotated token revokes family + alerts.

### Integration (Mongo-backed, staging Atlas or `mongodb-memory-server`)
- Full password login → session cookie set → `GET /dashboard` (proxy gate) allows → `requireAuth` returns session.
- Full Google flow: mock Google token endpoint + JWKS; approved `sub` → session; unapproved → redirect `?error=oauth_*`.
- Password change bumps `accountSecurityVersion`; old session invalidated on next `validateSession`.
- Admin disable → active sessions revoked; user cannot log in.
- Audit log row written for each event; no secret/credential fields present (assert log payload shape).

### End-to-end (Playwright, `tests/auth.spec.ts`)
- **Valid password login** → lands on `/dashboard`.
- **Invalid password** → error shown, no redirect; lockout after N tries.
- **Unknown user** → same generic error as wrong password.
- **Disabled user** (seeded) → cannot reach dashboard.
- **Approved Google login** (stubbed provider) → dashboard.
- **Unapproved Google login** → redirected to login with error.
- **Expired session** → visiting `/dashboard` redirects to login (proxy gate + `requireAuth`).
- **Tampered cookie** → redirect to login.
- **Removed user old session** → redirect to login.
- **Authorization bypass** — `member` hitting an admin-only action → neutral permission error; never succeeds.
- **CSRF** — cross-origin POST to logout/refresh → 403 / neutral.
- **Open redirect** — OAuth `error`/`state` tampering → safe redirect to `APP_URL` login, no external nav.
- **Concurrent logins** — 5 parallel fails from one IP/identifier → account locks (assert once).
- **Case-variant email** — login with `User@X.com` and `user@x.com` both resolve to same account.
- **Production cookie config** — assert `Set-Cookie` has `HttpOnly`, `Secure`, `SameSite=Lax` (session) / `Strict` (refresh), correct `Path`; no `Domain` wildcard.

---

### Closing notes
- Do **not** migrate to stateless JWTs or add Redis — the current DB-backed, rotated-refresh design is the correct fit and already provides instant revocation, device binding, and theft detection.
- Do **not** relax the no-email-auto-link OAuth policy — it is the single most important account-takeover defense for a fixed-user app.
- The prior two reports in `docs/` are superseded by this one for the current source state; the "no middleware / no headers" claim in the comprehensive report does not apply because Next 16 renamed `middleware`→`proxy` and the project uses `src/proxy.ts` + `next.config.ts` headers.
