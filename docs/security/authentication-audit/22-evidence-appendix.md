# 22 — Evidence Appendix

**Audit Date:** 2026-07-27
**Commit:** `32af9be`

This appendix provides evidence references for key findings across the audit, organized by finding category.

---

## A. Debug File Writes (OPS-001 / NEXT-019)

**File:** `src/auth/actions/verify-2fa.ts:125-138`

```typescript
const fs = await import('fs');
fs.appendFileSync('debug-verify.log', '\n\n[DEBUG] pendingAuth.deviceObjectId: ' + pendingAuth.deviceObjectId + '\n');
fs.appendFileSync('debug-verify.log', '[DEBUG] device lookup result: ' + JSON.stringify(deviceLookup) + '\n');
fs.appendFileSync('debug-verify.log', '[DEBUG] showTrustPrompt: ' + showTrustPrompt + '\n');
```

**Impact:** Filesystem write of internal device state on every 2FA verification. Production blocker.

---

## B. Timing Side-Channel Mitigation (PWD-004, PWD-006, PWD-009)

**File:** `src/auth/services/login.service.ts:26-28, 73-99`

```typescript
function randomDelayMs(max = 50): number {
  return Math.floor(Math.random() * (max + 1));
}
// Unknown email path:
await verifyPassword(DUMMY_HASH, password);
await new Promise((r) => setTimeout(r, randomDelayMs()));
throw new InvalidCredentialsError('User record not found');
// Known email but deleted/suspended: immediate throw (no verify, no delay)
if (user.status === 'suspended') { throw new AccountSuspendedError(); }
```

**Evidence:**
- PWD-004: Random delay ceiling (50ms) is too low to mask Argon2 verify variance
- PWD-006: Status checks before password verify leak timing
- PWD-009: `Math.random()` is not cryptographically secure

---

## C. Argon2id Parameters (PWD-001, PWD-002)

**File:** `src/auth/crypto/password.ts:12-14`

```typescript
memoryCost: 65536, // 64 MB
timeCost: 3,
parallelism: 1,    // OWASP recommends 4
```

**Impact:** Parallelism of 1 reduces GPU memory pressure for offline attackers.

---

## D. Reset Token Entropy (RST-001)

**File:** `src/auth/repositories/verification-token.repository.ts:24, 30`

```typescript
async create(data, ttlMs, byteLength = 8, tokenOverride?) {
  const raw = tokenOverride ?? generateToken(byteLength); // 8 bytes = 64 bits
```

**Impact:** Below NIST SP 800-63B minimum of 128 bits for reset tokens.

---

## E. OAuth State Not Constant-Time (OAUTH-002)

**File:** `src/auth/services/oauth.service.ts:248`

```typescript
if (!state || !expectedState || state !== expectedState) {
  throw new Error('OAuth state mismatch (possible CSRF)');
}
```

**Impact:** Uses JavaScript string inequality instead of `crypto.timingSafeEqual`. Low practical risk for 256-bit random state.

---

## F. Missing email_verified Check (OAUTH-003)

**File:** `src/auth/services/oauth.service.ts:263-267` (web) vs `:514` (mobile)

```typescript
// Web path — no email_verified check:
const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
if (!oauthAccount) { throw ... }

// Mobile path — checks email_verified:
if (!profile.email_verified) { throw new Error('Google email is not verified.'); }
```

**Impact:** Web path accepts unverified Google emails. Mitigated by pre-provisioning model.

---

## G. No Unique Index on OAuth Accounts (OAUTH-015)

**File:** `src/auth/repositories/oauth-account.repository.ts:30-31`

```typescript
const existing = await this.collection.findOne({ provider, providerAccountId });
if (existing) {
  // ... update existing
  return existing;
}
// No unique index — concurrent inserts could create duplicates
await this.collection.insertOne({ userId, provider, providerAccountId, ... });
```

**Impact:** Race condition possible if public linking API is added without the index.

---

## H. TOTP Secrets Stored in Plaintext (MFA-TOTP-001)

**File:** `src/auth/repositories/mfa.repository.ts:6-26`

```typescript
async saveTotpSecret(userId: ObjectId, secret: string) {
  await this.collection.updateOne(
    { userId },
    { $set: { secret } },  // secret stored as plaintext Base32
    { upsert: true }
  );
}
```

**Impact:** DB compromise exposes all TOTP secrets.

---

## I. 2FA Disable Without Reauthentication (MFA-BYPASS-001)

**File:** `src/auth/actions/mfa.ts:46-53`

```typescript
export async function disableTotpAction() {
  const session = await requireActiveSession();  // session-only check, no password re-entry
  await mfaService.disableTotp(session.userId);
```

**Impact:** Attacker with stolen session cookie can disable TOTP.

---

## J. TOTP Replacement Without Current Factor (MFA-BYPASS-002)

**File:** `src/auth/actions/mfa.ts:19-42`, `src/auth/services/mfa.service.ts:78-95`

No check for existing TOTP before generating new secret. `saveTotpSecret()` uses `updateOne` with upsert — silently replaces.

**Impact:** Attacker with valid session replaces victim's TOTP with their own.

---

## K. Mobile Admin Routes Missing Bearer Auth (AUTHZ-003)

**Files:**
- `src/app/api/mobile/v1/admin/categories/route.ts:6` — no `authenticateBearerRequest()`
- `src/app/api/mobile/v1/admin/products/route.ts:6` — same
- `src/app/api/mobile/v1/admin/sessions/revoke/route.ts:10` — same

vs. sections and users routes which DO call `authenticateBearerRequest()`.

**Impact:** Mobile clients cannot use these endpoints; broken for intended mobile purpose.

---

## L. Session Revocation Trusts Form Input (AUTHZ-005)

**File:** `src/auth/actions/session.ts:51-109`

```typescript
// currentSessionId comes from form data, not verified session:
const currentSessionId = formData.get('currentSessionId') as string | null;
// ...
const current = await sessionRepo.findById(new ObjectId(currentSessionId));
if (!current || !current.userId.equals(target.userId)) { ... }
```

**Impact:** Ownership check uses user-supplied session ID instead of authenticated session.

---

## M. Category/Product Actions Missing CSRF Guard (NEXT-008)

**Files:** `src/auth/actions/category.actions.ts:7,31,55`, `src/auth/actions/product.actions.ts:7,46,90`

All auth actions are wrapped with `withCsrfGuard`, but CMS CRUD actions are not.

**Impact:** Reduced CSRF defense depth for CMS operations.

---

## N. HSTS Must Be at Edge (DEPLOY-001)

**File:** `next.config.ts:32-35`

```typescript
// Comment in next.config.ts:
// HSTS must be configured at the edge (Vercel/Netlify _headers)
// It is not included in the securityHeaders array
```

**Impact:** Without edge HSTS, initial HTTP requests send session cookies in cleartext.

---

## O. No Rate Limit on Refresh Endpoint (RATE-001)

**File:** `src/app/api/auth/refresh/route.ts:23-106`

No `RateLimitService.checkRateLimit()` call before `sessionService.rotateRefreshToken()`.

**Impact:** Flooding refresh endpoint could exhaust MongoDB connection pool.

---

## P. Dev Mode Logs 2FA Codes (OPS-002)

**File:** `src/auth/services/mailer.ts:52-54`

```typescript
if (!mailer || !env.EMAIL_FROM) {
  console.info(`[mail:dev] to=${options.to} subject=${options.subject}\n${options.text}`);
  return { messageId: 'dev-mode' };
}
```

**Impact:** 2FA codes and reset links logged to stdout when email not configured.

---

## Q. Database Config Leaks URI (OPS-003)

**File:** `src/database/config.ts:54`

```typescript
violations.push(`MONGODB_URI: must start with 'mongodb://' or 'mongodb+srv://' (got "${uri.slice(0, 20)}...")`);
```

**Impact:** First 20 chars of URI may include username and password prefix.

---

## R. In-Memory Spike Buckets (RATE-009 / OPS-006)

**File:** `src/auth/services/alerting.service.ts:249`

```typescript
private static readonly failureBuckets = new Map<string, number[]>();
```

**Impact:** In serverless, each instance has independent buckets — spike detection diluted.

---

## S. Trusted Device Never Expires (MFA-BYPASS-003)

**File:** `src/auth/repositories/device.repository.ts:285`

```typescript
await this.collection.updateOne(
  { _id: deviceId, userId },
  { $set: { trusted: true, trustedUntil: null, trustGrantedBy: 'user' } }
);
```

**Impact:** `trustedUntil` always null — devices remain trusted indefinitely.

---

## T. Lockout Has No Escalation (PWD-008)

**File:** `src/auth/services/login.service.ts:40-41`

```typescript
private readonly LOCKOUT_THRESHOLD = 5;
private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // Fixed 15 minutes
```

**Impact:** Attacker keeps account permanently locked with 5 requests per 15 minutes.
