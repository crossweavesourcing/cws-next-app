# 22 — Evidence Appendix (Fresh Audit)

**Audit Date:** 2026-07-28
**Commit:** `32af9be`

This appendix provides evidence references for key findings across the audit, organized by finding category.

---

## A. OAuth Refresh Cookie SameSite Inconsistency (FINDING-01)

**File:** `src/app/api/auth/google/callback/route.ts:151-157`

```typescript
// OAuth callback sets SameSite: 'lax':
cookies().set('cws_refresh', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',  // <-- inconsistent
  path: '/',
  maxAge: refreshMaxAge,
});
```

**vs.** `src/app/api/auth/refresh/route.ts:114` and `setAuthCookies()`:
```typescript
sameSite: 'strict',  // <-- everywhere else
```

**Impact:** Weakens SameSite defense-in-depth after OAuth login. Mitigated by CSRF origin check.

---

## B. TOTP Re-enrollment Without Sudo Mode (FINDING-02)

**File:** `src/auth/actions/mfa.ts:35-46`

```typescript
export async function verifyAndEnableTotpAction(formData: FormData) {
  const session = await requireActiveSession();  // <-- no requireSudoMode()
  if (!session) return { error: 'Authentication required' };
  // ... generates and verifies new TOTP secret
  // ... silently replaces existing TOTP via upsert
}
```

**Impact:** Attacker with valid session can replace victim's TOTP with their own authenticator.

---

## C. No Rate Limit on Refresh Endpoint (FINDING-03)

**File:** `src/app/api/auth/refresh/route.ts:23-106`

```typescript
export async function POST(request: Request) {
  // ... parses refresh token
  // ... calls rotateRefreshToken()
  // NO rate limit check before token rotation
}
```

**Impact:** Flooding could exhaust MongoDB connection pool (`maxPoolSize: 10`).

---

## D. TOTP_ENCRYPTION_KEY Boot Guard (FINDING-04)

**File:** `src/auth/config/env.ts:11` (schema definition)

```typescript
TOTP_ENCRYPTION_KEY: z.string().optional(),
```

**File:** `src/auth/services/mfa.ts` (usage)

```typescript
// Used for AES-256-GCM encryption of TOTP secrets
```

**Impact:** If boot guard does not enforce minimum key length in production, TOTP secrets could be encrypted with a weak key.

---

## E. Dev-Mode Mailer Logs 2FA Codes (FINDING-05)

**File:** `src/auth/services/mailer.ts:52-54`

```typescript
if (!mailer || !env.EMAIL_FROM) {
  console.info(`[mail:dev] to=${options.to} subject=${options.subject}\n${options.text}`);
  // options.text contains 2FA codes and reset links
  return { messageId: 'dev-mode' };
}
```

**Impact:** Production without email config leaks all 2FA codes and reset links to stdout/container logs.

---

## F. Debug Filesystem Writes (FINDING-06)

**File:** `src/auth/actions/verify-2fa.ts:125-138`

```typescript
const fs = await import('fs');
fs.appendFileSync('debug-verify.log', '\n\n[DEBUG] pendingAuth.deviceObjectId: ' + pendingAuth.deviceObjectId + '\n');
fs.appendFileSync('debug-verify.log', '[DEBUG] device lookup result: ' + JSON.stringify(deviceLookup) + '\n');
fs.appendFileSync('debug-verify.log', '[DEBUG] showTrustPrompt: ' + showTrustPrompt + '\n');
```

**Impact:** Filesystem write of internal device state on every 2FA verification. Information disclosure and unbounded disk growth.

---

## G. OAuth State Non-Timing-Safe Comparison (FINDING-07)

**File:** `src/auth/services/oauth.service.ts:248`

```typescript
if (!state || !expectedState || state !== expectedState) {
  throw new Error('OAuth state mismatch (possible CSRF)');
}
```

**Impact:** Uses JavaScript string inequality instead of `crypto.timingSafeEqual`. Practical attack infeasible due to 256-bit entropy.

---

## H. No Per-IP Rate Limit on Password Reset (FINDING-08)

**File:** `src/auth/services/password.service.ts:244-249`

```typescript
async requestReset(email: string, ipAddress?: string) {
  // Records IP but does not call checkIpRateLimit()
  // Per-email limit prevents flooding single email
  // Per-IP limit not enforced
}
```

**Impact:** Attacker distributes reset requests across different emails from same IP without triggering IP-level limit.

---

## I. HSTS Not in Application Code (FINDING-09)

**File:** `next.config.ts:32-35`

```typescript
// Comment in next.config.ts:
// HSTS must be configured at the edge (Vercel/Netlify _headers)
// It is not included in the securityHeaders array
```

**Impact:** Without HSTS, SSL stripping attacks possible on first visit.

---

## J. No CAPTCHA on Login (FINDING-16)

**File:** `src/app/api/auth/login/route.ts`

No CAPTCHA mechanism present. Login relies on IP+identifier rate limiting and account lockout.

**Impact:** Sophisticated attacker could distribute attempts across IPs via botnet.

---

## K. Reset Token in URL Query Parameter (FINDING-17)

**File:** `src/auth/services/password.service.ts:266`

```typescript
const resetUrl = `${baseUrl}/reset-password?token=${token}`;
// Token appears in URL query parameter
```

**Impact:** Token may appear in browser history, server logs, proxy logs, and Referer headers. Mitigated by short TTL (30 min) and single-use.

---

## L. No Lockout Email Notification (FINDING-18)

**File:** `src/auth/services/login.service.ts:133-136`

```typescript
if (failedAttempts >= this.LOCKOUT_THRESHOLD) {
  await loginAttemptRepo.lockAccount(userId, this.LOCKOUT_DURATION_MS);
  // No email notification sent
}
```

**Impact:** User may not know account is locked until they try to log in.

---

## M. JWKS Fetch Has No Timeout (FINDING-19)

**File:** `src/auth/services/oauth.service.ts:56`

```typescript
const response = await fetch(JWKS_URI);
// No AbortController or timeout configured
```

**Impact:** Slow Google response could consume function execution time.

---

## N. CSP style-src unsafe-inline (FINDING-28)

**File:** `next.config.ts:59`, `src/proxy.ts:40`

```typescript
style-src 'self' 'unsafe-inline';
// Required by React/Next.js for runtime inline styles
```

**Impact:** XSS could inject inline styles. Mitigated by script-src nonce protection.

---

## O. Spike Alerting Uses In-Memory Aggregation (FINDING-24)

**File:** `src/auth/services/alerting.service.ts:249`

```typescript
private static readonly failureBuckets = new Map<string, number[]>();
// Not shared across serverless instances
```

**Impact:** Distributed attacks may not trigger spike alerts due to per-instance dilution.

---

## P. Permissions-Policy Incomplete (FINDING-26)

**File:** `next.config.ts:50-52`

```typescript
permissionsPolicy: {
  camera: false,
  microphone: false,
  geolocation: false,
  // payment, USB, etc. allowed by default
}
```

**Impact:** XSS could abuse unrestricted browser APIs. Low risk given CSP nonce protection.

---

## Q. Serverless Race Condition on Rate Limits (FINDING-23)

**File:** `src/auth/repositories/login-attempt.repository.ts:24-31`

```typescript
const count = await this.collection.countDocuments(filter);
// Non-atomic: count + insert allows race condition
await this.collection.insertOne(attempt);
```

**Impact:** Under high concurrency, limits may be slightly exceeded (1-3 requests).

---

## R. TOTP Plaintext Fallback in Dev (FINDING-36)

**File:** `src/auth/repositories/mfa.repository.ts:9`

```typescript
// When TOTP_ENCRYPTION_KEY not set:
// Secret stored as plaintext Base32
// Gated to development environments only
```

**Impact:** Low — production requires encryption key.
