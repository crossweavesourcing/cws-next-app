# 14 — Rate Limiting and Abuse Prevention Audit

| Field | Value |
|---|---|
| Audit Date | 2026-07-28 |
| Scope | Rate limiting, brute-force protection, account lockout, per-endpoint throttling, distributed-attack resilience |
| Files Reviewed | `src/auth/services/rate-limit.service.ts`, `src/auth/actions/password-reset.ts`, `src/auth/actions/verify-2fa.ts`, `src/auth/actions/verify-totp.ts`, `src/auth/services/two-factor.service.ts`, `src/auth/services/login.service.ts`, `src/auth/lib/request.ts`, `src/auth/lib/ip.ts`, `src/app/api/auth/refresh/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/auth/repositories/login-attempt.repository.ts`, `src/auth/config/env.ts`, `src/auth/services/alerting.service.ts`, `src/database/indexes/login-attempts.indexes.ts` |

---

## Executive Summary

The application implements a layered rate-limiting architecture backed by MongoDB, providing coherent counters across serverless instances. Login, password reset, 2FA (email OTP and TOTP), and OAuth callback flows are all rate-limited with appropriate windows and thresholds. The UNTRUSTED_IP_SENTINEL guard and TRUSTED_PROXY_IP_HEADER boot guard together prevent the most critical failure mode (platform-wide login lockout when IP is unknown). However, several endpoints lack dedicated rate limiting (session refresh, WebAuthn), IPv6 normalization is not verified, and the serverless read-then-write pattern on rate-limit counters introduces a small race window.

---

## Rate Limiting Inventory

### Login (password) — `RateLimitService`
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-IP failures | 20 | 15 min | MongoDB `login_attempts.ipAddress` |
| Per-identifier failures | 10 | 15 min | MongoDB `login_attempts.identifier` |
| Progressive delay | After 5 failures: 2s, 4s, 8s... | Cumulative | In-memory |
| Account lockout | 5 failures → 15 min lock | 15 min | MongoDB `users.security.lockedUntil` (atomic conditional write) |

### 2FA Email OTP — Verification
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| Per-user 2FA failures | 5 | 15 min | MongoDB `login_attempts` |

### 2FA Email OTP — Resend
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Cooldown floor | 30 seconds | 30 sec | MongoDB `login_attempts` |
| Burst cap | 5 resends | 10 min | MongoDB `login_attempts` |

### TOTP — Verification
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| Per-user TOTP failures | 5 | 15 min | MongoDB `login_attempts` |
| Account lockout | Shared with login lockout | 15 min | MongoDB `users.security.lockedUntil` |

### Recovery Codes
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| 2FA failure counter | 5 | 15 min | MongoDB `login_attempts` (shares window with email OTP and TOTP) |

### Password Reset — Request
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-email requests | 5 | 15 min | MongoDB `login_attempts` |
| Per-IP requests | 20 | 15 min | MongoDB `login_attempts` |

### Password Reset — Completion
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-token-prefix | 10 | 15 min | MongoDB `login_attempts` |

### OAuth Callback (Google)
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-IP exchanges | 20 | 15 min | MongoDB `login_attempts` |

### Session Refresh
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| **None** | — | — | — |

### WebAuthn
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| **Not verified** | — | — | — |

---

## Findings

### RATE-001 — All Rate Limiting Is MongoDB-Backed (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/repositories/login-attempt.repository.ts` — all counters use `login_attempts` collection with MongoDB indexes; `src/database/indexes/login-attempts.indexes.ts` defines supporting indexes |

**Validation:** All rate-limit counters persist in MongoDB rather than in-memory. This means counters are coherent across serverless function instances, preventing an attacker from spreading requests across cold instances to bypass limits.

---

### RATE-002 — UNTRUSTED_IP_SENTINEL Guard Prevents DoS (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/lib/ip.ts:16` — `UNTRUSTED_IP_SENTINEL = '0.0.0.0'`; `src/auth/services/rate-limit.service.ts:37-45` — skips IP check for sentinel value |

**Validation:** When IP cannot be resolved (e.g., no trusted proxy), the sentinel value `0.0.0.0` is used. The rate-limit service explicitly skips the IP-based bucket for this sentinel, relying solely on per-identifier limits and account lockout. This prevents a scenario where all traffic collapses into one IP bucket and locks out every login platform-wide.

---

### RATE-003 — TRUSTED_PROXY_IP_HEADER Boot Guard (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:231-239` — refuses to boot without `TRUSTED_PROXY_IP_HEADER` in production mode |

**Validation:** The production boot guard ensures the trusted proxy header is configured before the application starts. This is the first line of defense against the sentinel collapse scenario. In development, a warning is emitted but boot proceeds.

---

### RATE-004 — No Rate Limiting on Session Refresh Endpoint

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/app/api/auth/refresh/route.ts:23-106` — no rate-limit check before `sessionService.rotateRefreshToken()` |

**Attack Scenario:** An attacker with a valid (or stolen) refresh token floods `POST /api/auth/refresh` at high frequency. Each call triggers a MongoDB read + write (token rotation), consuming serverless compute time and database connection pool slots. On shared MongoDB Atlas free/low-tier plans this could exhaust the connection pool (configured at `maxPoolSize: 10` in `src/database/client.ts:47`), blocking all application traffic.

**Impact:** Denial-of-service against all authenticated users; database connection pool exhaustion.

**Root Cause:** The refresh endpoint relies on origin-check (`assertSameOriginStrict`) and refresh token rotation for security, but no explicit per-IP or per-token request throttle exists.

**Remediation:** Add a per-IP rate limit (e.g., 60 requests/min) and/or a per-refresh-token limit (e.g., 5 rotations per 5 min) using the existing `LoginAttemptRepository.countRecentByIpFilter()` pattern.

**Acceptance Criteria:**
1. `POST /api/auth/refresh` enforces a per-IP rate limit using MongoDB-backed counters.
2. Exceeding the limit returns HTTP 429 with a `Retry-After` header.
3. Unit tests verify the rate-limit path.

**Regression Tests:**
```typescript
it('returns 429 when per-IP refresh limit is exceeded', async () => {
  // Mock getClientIp to return same IP, seed login_attempts with 60 records
  // Verify the endpoint returns 429 after the limit is reached.
});
```

---

### RATE-005 — No Verified Rate Limiting on WebAuthn Endpoints

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/app/api/auth/webauthn/login-options/route.ts` — no rate-limit check; `src/app/api/auth/webauthn/login-verify/route.ts` — no IP-based rate limit |

**Attack Scenario:** An attacker floods `/api/auth/webauthn/login-options` to trigger expensive WebAuthn challenge generation (crypto operations, DB writes). The verify endpoint has challenge replay protection (single-use), but the options endpoint could be abused to generate high database write volume.

**Impact:** Database write amplification; potential compute cost increase on serverless platforms.

**Root Cause:** WebAuthn endpoints do not have explicit IP-based rate limiting. They rely on challenge single-use semantics and the login-level lockout for authenticated paths.

**Remediation:** Add a per-IP rate limit on the WebAuthn login-options endpoint (e.g., 20 per 15 min) using the existing `LoginAttemptRepository` pattern.

**Acceptance Criteria:**
1. `POST /api/auth/webauthn/login-options` enforces a per-IP rate limit.
2. Rate limit is checked before challenge generation.

**Regression Tests:**
```typescript
it('rate-limits WebAuthn login-options by IP', async () => {
  // Record 20 WebAuthn option requests from the same IP
  // Verify the 21st is rejected
});
```

---

### RATE-006 — IPv6 Address Normalization Not Verified

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/lib/request.ts:33` — `value.split(',')[0].trim()` (raw value); `src/auth/repositories/login-attempt.repository.ts:24-31` — keys on raw `ipAddress` string |

**Attack Scenario:** An IPv6 client sends requests using different representations of the same address (e.g., `2001:db8::1` vs `2001:0db8:0000:0000:0000:0000:0000:0001`). Each representation creates a separate rate-limit bucket, allowing the attacker to effectively multiply their allowed attempts.

**Impact:** Per-IP rate limits bypassed for IPv6 clients; increased brute-force surface.

**Root Cause:** The `getClientIp()` function returns the raw header value without normalizing the IP format. MongoDB indexes on `ipAddress` are string-exact-match.

**Remediation:** Normalize IPv6 addresses in `getClientIp()` by parsing through a lightweight normalization function (collapse compressed form, lowercase hex, strip leading zeros).

**Acceptance Criteria:**
1. `getClientIp()` returns a normalized form for IPv6 addresses.
2. Different textual representations of the same IPv6 address produce the same rate-limit bucket key.

**Regression Tests:**
```typescript
it('normalizes equivalent IPv6 representations', async () => {
  // Call getClientIp with x-forwarded-for = '2001:db8::1'
  // and TRUSTED_PROXY_IP_HEADER set to a header with '2001:0db8:0000:...'
  // Verify both produce the same value
});
```

---

### RATE-007 — Recovery Code Brute-Force Shares 2FA Failure Window

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/two-factor.service.ts:88-141` — recovery code tried after email 2FA failure; `src/auth/services/two-factor.service.ts:131-137` — `countRecent2FAFailures` triggers code invalidation at threshold |

**Attack Scenario:** An attacker submits recovery codes and email 2FA codes interchangeably. Both consume the same `MAX_2FA_FAILURES` (5) counter. After 5 combined failures the 2FA code is invalidated, but the recovery code path uses a different repository lookup (`recoveryRepo.redeem`) that is not independently throttled.

**Impact:** The 5-per-15-min aggregate limit applies, but the attacker gets to alternate between two verification methods within that budget.

**Root Cause:** The `countRecent2FAFailures` counter is shared between email code and recovery code failures, which is appropriate for aggregate protection, but there is no per-method sub-limit.

**Remediation:** Consider a separate per-user counter specifically for recovery code failures (e.g., 3 per 15 min) to constrain recovery code brute-force independently.

**Acceptance Criteria:**
1. Recovery code failures are tracked with a dedicated `identifierType` or separate counter.
2. A per-user recovery code failure limit (<= 3 per 15 min) is enforced before attempting DB lookup.

**Regression Tests:**
```typescript
it('blocks recovery code attempts after per-user recovery failure limit', async () => {
  // Record 3 recovery code failures for a user
  // Verify the 4th attempt is rejected without calling recoveryRepo.redeem
});
```

---

### RATE-008 — Password Reset Request Allows Repeated Cycles

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/actions/password-reset.ts:13-16` — 5 requests/15 min per email; no daily cap |

**Attack Scenario:** An attacker requests a password reset, waits 15 minutes, requests again, and repeats indefinitely. Each cycle sends one email to the target address. Over 24 hours this results in up to 480 emails (5 per 15-min window x 96 windows).

**Impact:** Email bombing / harassment of target user.

**Root Cause:** Rate limits use a sliding 15-minute window with no longer-term daily or weekly cap.

**Remediation:** Add a daily cap on password reset requests per email (e.g., 15 per 24 hours). Track via a separate daily-bucketed counter or a wider-window query.

**Acceptance Criteria:**
1. A per-email daily limit (e.g., 15 requests/24h) is enforced.
2. The daily counter is MongoDB-backed for serverless coherence.

**Regression Tests:**
```typescript
it('blocks password reset requests after daily limit', async () => {
  // Seed 15 reset request records within 24 hours
  // Verify the 16th request is throttled
});
```

---

### RATE-009 — Serverless Race Condition on Rate-Limit Counters

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/repositories/login-attempt.repository.ts:24-31` — `countDocuments` + separate `insertOne` (non-atomic) |

**Attack Scenario:** Under concurrent requests in a serverless environment, two requests can both read a count below the threshold, both proceed, and both insert records — exceeding the intended limit by the number of concurrent requests.

**Impact:** Rate limits may be slightly exceeded (typically by 1-3 requests) under high concurrency.

**Root Cause:** The rate-limit check is a read-then-write pattern (count documents, then insert), not an atomic operation. MongoDB does not provide a compare-and-swap on count.

**Remediation:** For exact enforcement, use a MongoDB `$inc`-based counter with a max-value check (e.g., `findOneAndUpdate` with conditional `$lt`). For the current application scale (small admin user base), the current approach is acceptable with documented tolerance.

**Acceptance Criteria:**
1. Document the accepted race window (<= 3 concurrent requests may exceed the limit).
2. The limit is still effective against sequential brute-force attacks.

**Regression Tests:**
```typescript
it('allows slight over-count under concurrent inserts but blocks sequential attacks', async () => {
  // Fire 20+ concurrent requests, verify count is within tolerance
  // Verify 21st sequential request is blocked
});
```

---

### RATE-010 — Login Failure Spike Alerting Uses In-Memory Aggregation

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/alerting.service.ts:249` — `private static readonly failureBuckets = new Map<string, number[]>()` |

**Attack Scenario:** In a serverless environment with many concurrent function instances, each instance maintains its own `failureBuckets` map. A distributed brute-force attack spreads failures across instances, and no single instance sees enough failures to trigger the spike threshold (10 per 5 min).

**Impact:** Spike alerts are diluted across serverless instances, reducing detection sensitivity.

**Root Cause:** The spike aggregation is an in-memory `Map` that is not shared across processes.

**Remediation:** For serverless deployments, either:
1. Increase the spike threshold to account for instance dilution, or
2. Move spike detection to MongoDB (query recent failure count for the identifier, analogous to `countRecentByIdentifier`).

**Acceptance Criteria:**
1. Spike detection works correctly in a single-instance deployment.
2. Document that multi-instance dilution is a known limitation.

**Regression Tests:**
```typescript
it('triggers spike alert in single-instance mode', async () => {
  // Record 10 failures for the same identifier in sequence
  // Verify spike event is emitted
});
```

---

### RATE-011 — No Global IP Lockout Across Accounts

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/login.service.ts:127-131` — lockout is per-user; `src/auth/services/rate-limit.service.ts:48-57` — identifier check is per-email |

**Attack Scenario:** An attacker rotates through a list of known email addresses from the same IP. Each email accumulates separate per-email failure counters (10 per 15 min each) and separate lockout buckets (5 failures per email). The per-IP limit (20 per 15 min) partially mitigates this, but the attacker can still attempt ~20 different emails before hitting the IP cap.

**Impact:** Slower but still possible credential enumeration and password guessing across multiple accounts.

**Root Cause:** The lockout mechanism (`recordFailedLoginAndMaybeLock`) operates on a per-user basis. The per-IP limit (20/15 min) is the only cross-account throttle.

**Remediation:** Consider a more aggressive per-IP failure limit (e.g., 10 per 15 min instead of 20) or an escalating IP lockout after N distinct accounts are attacked.

**Acceptance Criteria:**
1. Per-IP failure count limits total cross-account brute-force attempts.
2. Documented acceptance that the current 20/15 min per-IP limit is the chosen trade-off.

**Regression Tests:**
```typescript
it('blocks login when per-IP failure count exceeds limit across accounts', async () => {
  // Record 20 failures from the same IP for different identifiers
  // Verify the 21st attempt from any identifier is blocked
});
```

---

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| RATE-001 | All rate limiting is MongoDB-backed | None (pass) | High | No |
| RATE-002 | UNTRUSTED_IP_SENTINEL guard prevents DoS | None (pass) | High | No |
| RATE-003 | TRUSTED_PROXY_IP_HEADER boot guard | None (pass) | High | No |
| RATE-004 | No rate limit on session refresh | Medium | High | No |
| RATE-005 | No verified rate limit on WebAuthn | Low | Medium | No |
| RATE-006 | IPv6 normalization not verified | Low | Medium | No |
| RATE-007 | Recovery code shares 2FA failure window | Low | High | No |
| RATE-008 | Password reset allows repeated cycles | Low | High | No |
| RATE-009 | Serverless race condition on counters | Low | Medium | No |
| RATE-010 | Spike alerting uses in-memory aggregation | Low | High | No |
| RATE-011 | No global IP lockout across accounts | Low | High | No |

---

## Recommendations Priority

1. **RATE-004** — Add per-IP rate limit to refresh endpoint (Medium effort, Medium impact)
2. **RATE-005** — Add rate limit to WebAuthn login-options (Low effort, Low impact)
3. **RATE-008** — Add daily cap on password reset requests (Low effort, Low impact)
4. **RATE-006** — Normalize IPv6 addresses in `getClientIp()` (Low effort, Low impact)
5. **RATE-007** — Separate recovery code failure counter (Low effort, Low impact)
6. **RATE-010** — Move spike detection to MongoDB for serverless (Medium effort, Low impact)
