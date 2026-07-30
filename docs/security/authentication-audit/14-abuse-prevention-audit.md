# 14 — Abuse Prevention & Rate Limiting Audit

| Field | Value |
|---|---|
| Audit Date | 2026-07-27 |
| Scope | Rate limiting, brute-force protection, account lockout, per-endpoint throttling, distributed-attack resilience |
| Files Reviewed | `src/auth/services/rate-limit.service.ts`, `src/auth/actions/password-reset.ts`, `src/auth/actions/verify-2fa.ts`, `src/auth/actions/verify-totp.ts`, `src/auth/services/two-factor.service.ts`, `src/auth/services/login.service.ts`, `src/auth/lib/request.ts`, `src/auth/lib/ip.ts`, `src/app/api/auth/refresh/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/auth/repositories/login-attempt.repository.ts`, `src/auth/config/env.ts`, `src/auth/services/alerting.service.ts`, `src/database/indexes/login-attempts.indexes.ts` |

---

## Executive Summary

The application implements a layered rate-limiting architecture backed by MongoDB, providing coherent counters across serverless instances. Login, password reset, 2FA, and OAuth callback flows are rate-limited. However, several endpoints lack dedicated rate limiting, and edge cases in IPv6 normalization, distributed consistency, and in-memory aggregation reduce the effectiveness of abuse prevention under sophisticated attack scenarios.

---

## Rate Limiting Inventory

### Login (password) — `RateLimitService`
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-IP failures | 20 | 15 min | MongoDB `login_attempts` |
| Per-email failures | 10 | 15 min | MongoDB `login_attempts` |
| Account lockout | 5 failures → 15 min lock | 15 min | MongoDB `users.security.lockedUntil` |

### Password Reset Request
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-email requests | 5 | 15 min | MongoDB `login_attempts` |
| Per-IP requests | 20 | 15 min | MongoDB `login_attempts` |

### Password Reset Submit (token-guessing)
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-token-prefix | 10 | 15 min | MongoDB `login_attempts` |

### Email 2FA Verify
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| Per-user 2FA failures | 5 | 15 min | MongoDB `login_attempts` |

### 2FA Resend
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Hard floor | 1 resend | 30 sec | MongoDB `login_attempts` |
| Burst cap | 5 resends | 10 min | MongoDB `login_attempts` |

### TOTP Verify
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| Tracked failures | Yes | 15 min | MongoDB `login_attempts` |

### OAuth Callback (Google)
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per-IP exchanges | 20 | 15 min | MongoDB `login_attempts` |

### Session Refresh
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| **None** | — | — | — |

### Recovery Code (via 2FA verify)
| Dimension | Limit | Window | Backing |
|---|---|---|---|
| Per pending session | 5 attempts (attemptsRemaining) | Per session TTL | MongoDB `pending_authentications` |
| 2FA failure counter | 5 | 15 min | MongoDB `login_attempts` |

---

## Findings

### RATE-001 — No Rate Limiting on Session Refresh Endpoint

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

### RATE-002 — TOTP Verification Has No Dedicated IP-Based Rate Limit

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/actions/verify-totp.ts:35-169` — only `pendingAuth.attemptsRemaining` limits attempts; `src/auth/actions/verify-totp.ts:77-90` records attempts but no IP check |

**Attack Scenario:** An attacker obtains multiple pending authentication tokens (by initiating separate logins with valid credentials that require MFA). Each pending session allows 5 TOTP guesses. With N concurrent pending sessions, the attacker gets 5×N TOTP attempts. The 6-digit TOTP space (1,000,000) is not practically brute-forced, but the lack of an IP-based aggregate limit means the same IP can generate unlimited pending sessions.

**Impact:** Elevated brute-force surface on TOTP codes across parallel login sessions.

**Root Cause:** TOTP verification only checks `attemptsRemaining` on the individual pending authentication record, not a cross-session aggregate per IP or per user.

**Remediation:** Add a per-user TOTP failure rate limit (e.g., 10 failures per 15 min across all pending sessions) using the existing `LoginAttemptRepository.countRecentByFilter()` with a dedicated `identifierType`.

**Acceptance Criteria:**
1. TOTP verification checks a per-user aggregate failure counter before attempting verification.
2. Exceeding the limit returns a safe error without attempting TOTP lookup.
3. Counter is MongoDB-backed (coherent across serverless instances).

**Regression Tests:**
```typescript
it('blocks TOTP verification when per-user aggregate failures exceed limit', async () => {
  // Seed login_attempts with 10 TOTP failures for the same user
  // Verify verifyTotpAction returns error without calling mfaService.verifyTotpLogin
});
```

---

### RATE-003 — Recovery Code Brute-Force Shares 2FA Failure Window

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/two-factor.service.ts:88-141` — recovery code is tried after email 2FA failure; `src/auth/services/two-factor.service.ts:131-137` — `countRecent2FAFailures` triggers code invalidation at threshold |

**Attack Scenario:** An attacker submits recovery codes and email 2FA codes interchangeably. Both consume the same `MAX_2FA_FAILURES` (5) counter. After 5 combined failures the 2FA code is invalidated, but the recovery code path uses a different repository lookup (`recoveryRepo.redeem`) that is not independently throttled.

**Impact:** The 5-per-15-min aggregate limit applies, but the attacker gets to alternate between two verification methods within that budget.

**Root Cause:** The `countRecent2FAFailures` counter is shared between email code and recovery code failures, which is appropriate for aggregate protection, but there is no per-method sub-limit.

**Remediation:** Consider a separate per-user counter specifically for recovery code failures (e.g., 3 per 15 min) to constrain recovery code brute-force independently.

**Acceptance Criteria:**
1. Recovery code failures are tracked with a dedicated `identifierType` or separate counter.
2. A per-user recovery code failure limit (≤ 3 per 15 min) is enforced before attempting DB lookup.

**Regression Tests:**
```typescript
it('blocks recovery code attempts after per-user recovery failure limit', async () => {
  // Record 3 recovery code failures for a user
  // Verify the 4th attempt is rejected without calling recoveryRepo.redeem
});
```

---

### RATE-004 — Per-IP Login Rate Limit Collapses to Global Bucket Without Trusted Proxy

| Field | Value |
|---|---|
| Severity | **Critical** (mitigated by boot guard) |
| Confidence | **High** |
| Production Blocker | No (boot guard prevents this in production) |
| Evidence | `src/auth/lib/ip.ts:16` — `UNTRUSTED_IP_SENTINEL = '0.0.0.0'`; `src/auth/services/rate-limit.service.ts:37-45` — skips IP check for sentinel; `src/auth/config/env.ts:231-239` — boot guard |

**Attack Scenario:** If `TRUSTED_PROXY_IP_HEADER` is unset in production (which the boot guard prevents), all requests resolve to `0.0.0.0`. Without the sentinel guard in `rate-limit.service.ts:37`, the IP rate limit would key all traffic into one bucket, and ~20 cross-user failures would lock out every login platform-wide.

**Impact:** Platform-wide login lockout (availability DoS).

**Root Cause:** The trusted-proxy header is mandatory in production, and the sentinel guard skips IP-based limits for unresolvable IPs.

**Remediation:** Already mitigated by:
1. Boot guard in `env.ts:231` refuses to start without `TRUSTED_PROXY_IP_HEADER` in production.
2. `rate-limit.service.ts:37` skips the IP bucket for `UNTRUSTED_IP_SENTINEL`.

**Acceptance Criteria:** (Already met)
1. Production boot fails without `TRUSTED_PROXY_IP_HEADER`.
2. Per-IP rate limit skips the sentinel, relying on per-identifier + lockout checks.

**Regression Tests:**
```typescript
it('does not rate-limit by IP when ip is UNTRUSTED_IP_SENTINEL', async () => {
  // Call checkRateLimit with UNTRUSTED_IP_SENTINEL and a fresh identifier
  // Verify no RateLimitError is thrown (IP dimension skipped)
});
```

---

### RATE-005 — IPv6 Address Normalization Not Enforced for Rate Limiting

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/lib/request.ts:33` — `value.split(',')[0].trim()` (raw value); `src/auth/repositories/login-attempt.repository.ts:24-31` — keys on raw `ipAddress` string |

**Attack Scenario:** An IPv6 client sends requests using different representations of the same address (e.g., `2001:db8::1` vs `2001:0db8:0000:0000:0000:0000:0000:0001`). Each representation creates a separate rate-limit bucket, allowing the attacker to effectively multiply their allowed attempts.

**Impact:** Per-IP rate limits bypassed for IPv6 clients; increased brute-force surface.

**Root Cause:** The `getClientIp()` function returns the raw header value without normalizing the IP format. MongoDB indexes on `ipAddress` are string-exact-match.

**Remediation:** Normalize IPv6 addresses in `getClientIp()` by parsing through `URL` or a lightweight IPv6 normalization function (collapse compressed form, lowercase hex, strip leading zeros).

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

### RATE-006 — No Global IP Lockout Across Accounts

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

### RATE-007 — Password Reset Request Allows Repeated Cycles

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/actions/password-reset.ts:13-16` — 5 requests/15 min per email; no daily cap |

**Attack Scenario:** An attacker requests a password reset, waits 15 minutes, requests again, and repeats indefinitely. Each cycle sends one email to the target address. Over 24 hours this results in up to 480 emails (5 per 15-min window × 96 windows).

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

### RATE-008 — Serverless Race Condition on Rate-Limit Counters

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
1. Document the accepted race window (≤ 3 concurrent requests may exceed the limit).
2. The limit is still effective against sequential brute-force attacks.

**Regression Tests:**
```typescript
it('allows slight over-count under concurrent inserts but blocks sequential attacks', async () => {
  // Fire 20+ concurrent requests, verify count is within tolerance
  // Verify 21st sequential request is blocked
});
```

---

### RATE-009 — Login Failure Spike Alerting Uses In-Memory Aggregation

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

### RATE-010 — No Dedicated Rate Limiting for WebAuthn Endpoints

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

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| RATE-001 | No rate limit on session refresh | Medium | High | No |
| RATE-002 | TOTP has no per-IP aggregate rate limit | Medium | High | No |
| RATE-003 | Recovery code shares 2FA failure window | Low | High | No |
| RATE-004 | IP bucket collapse without trusted proxy | Critical (mitigated) | High | No |
| RATE-005 | IPv6 normalization not enforced | Low | Medium | No |
| RATE-006 | No global IP lockout across accounts | Low | High | No |
| RATE-007 | Password reset allows repeated cycles | Low | High | No |
| RATE-008 | Serverless race condition on counters | Low | Medium | No |
| RATE-009 | Spike alerting uses in-memory aggregation | Low | High | No |
| RATE-010 | No rate limit on WebAuthn endpoints | Low | Medium | No |

---

## Recommendations Priority

1. **RATE-001** — Add per-IP rate limit to refresh endpoint (Medium effort, Medium impact)
2. **RATE-002** — Add per-user aggregate TOTP failure limit (Low effort, Medium impact)
3. **RATE-007** — Add daily cap on password reset requests (Low effort, Low impact)
4. **RATE-005** — Normalize IPv6 addresses in `getClientIp()` (Low effort, Low impact)
5. **RATE-010** — Add rate limit to WebAuthn login-options (Low effort, Low impact)
6. **RATE-003** — Separate recovery code failure counter (Low effort, Low impact)
7. **RATE-009** — Move spike detection to MongoDB for serverless (Medium effort, Low impact)
