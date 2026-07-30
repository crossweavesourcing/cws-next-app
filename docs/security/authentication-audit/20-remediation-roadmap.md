# 20 — Remediation Roadmap

**Audit Date:** 2026-07-27
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

---

## Overview

This roadmap organizes all open findings by priority with specific implementation guidance. Each item includes file paths, code changes, and verification steps.

---

## P0 — Critical (Deploy Blockers)

Fix immediately. Estimated total effort: 4-6 hours.

### OPS-001 / NEXT-019 — Remove Debug File Writes

**Files to modify:**
- `src/auth/actions/verify-2fa.ts`

**Changes:**
1. Remove `import { appendFileSync } from 'fs'` (line ~1)
2. Remove all `appendFileSync` calls (lines ~125-138)
3. Remove any `debug-verify.log` references

**Verification:**
```bash
grep -r "appendFileSync\|debug-verify" src/
# Should return zero matches
```

**Tests:**
- Verify 2FA verification completes without filesystem writes
- Verify no debug log files created

---

### DEPLOY-001 — Configure HSTS at Edge

**Files to modify:**
- `next.config.ts` (add HSTS header as defense-in-depth)
- Edge platform configuration (Vercel/Netlify)

**Changes in next.config.ts:**
```typescript
{
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}
```

**Edge configuration:**
- Vercel: Add to `vercel.json` under `headers`
- Netlify: Add to `_headers` file

**Verification:**
```bash
curl -I https://your-domain.com/dashboard | grep -i strict-transport
# Should return: strict-transport-security: max-age=63072000; includeSubDomains; preload
```

**Tests:**
- E2E test: Verify HSTS header on admin routes
- E2E test: Verify max-age >= 31536000

---

### PWD-007 / RATE-004 — Verify Boot Guard Functional

**Files to verify:**
- `src/auth/config/env.ts` (boot guard)
- `src/auth/lib/request.ts` (getClientIp)
- `src/auth/services/rate-limit.service.ts` (sentinel check)

**Verification:**
1. Deploy without TRUSTED_PROXY_IP_HEADER in staging
2. Verify application refuses to boot or logs critical error
3. Verify sentinel (0.0.0.0) is never used as rate-limit key

**Tests:**
```bash
# Integration test
TRUSTED_PROXY_IP_HEADER= pnpm test -- --grep "boot guard"

# Verify sentinel usage prevention
TRUSTED_PROXY_IP_HEADER= pnpm test -- --grep "sentinel"
```

**If boot guard is NOT functional:**
- Add runtime assertion in `getClientIp()`
- Add sentinel check in rate-limit.service.ts

---

### OAUTH-015 — Add Unique Index on OAuth Accounts

**Files to modify:**
- `src/auth/repositories/oauth-account.repository.ts`
- `src/database/indexes/` (add new index file)

**Changes:**
```typescript
// In oauth-account.repository.ts link() method
try {
  await this.collection.insertOne(doc);
} catch (error) {
  if (error.code === 11000) { // Duplicate key
    // Idempotent: link already exists
    return this.findByProvider(provider, providerAccountId);
  }
  throw error;
}
```

**Index definition:**
```typescript
// src/database/indexes/oauth-accounts.indexes.ts
export const oauthAccountsIndexes = [
  { key: { provider: 1, providerAccountId: 1 }, unique: true },
  { key: { userId: 1, provider: 1 }, unique: true },
];
```

**Verification:**
```bash
# Verify index exists
mongosh --eval "db.oauth_accounts.getIndexes()"

# Test concurrent insertion
pnpm test -- --grep "concurrent link"
```

**Tests:**
- Concurrent insertion test: verify exactly one document
- Duplicate key handling: verify idempotent behavior

---

## P1 — High (Fix This Sprint)

Fix within 1-2 weeks. Estimated total effort: 2-3 days.

### PWD-004 — Increase Login Timing Mitigation

**Files to modify:**
- `src/auth/services/login.service.ts`

**Changes:**
```typescript
// Replace random delay
const randomDelayMs = (max: number): number => {
  return crypto.randomInt(max + 1);
};

// Increase delay floor and jitter
const FLOOR_MS = 100;
const JITTER_MS = 100;
const delay = FLOOR_MS + randomDelayMs(JITTER_MS);
await sleep(delay);
```

**Verification:**
```bash
# Statistical test
pnpm test -- --grep "timing distribution"

# Timing analysis
pnpm test:load -- --endpoint /api/auth/login --samples 1000
```

**Tests:**
- Unit test: randomDelayMs returns values in [0, max]
- Integration test: timing distribution indistinguishable under 1000+ samples

---

### RST-001 — Increase Reset Token Entropy

**Files to modify:**
- `src/auth/repositories/verification-token.repository.ts`

**Changes:**
```typescript
// Change default byteLength from 8 to 16
async function generateToken(byteLength = 16): Promise<string> {
  return randomBytes(byteLength).toString('hex');
}
```

**Verification:**
```bash
# Verify token length
pnpm test -- --grep "reset token"
# Token should be 32 hex characters (16 bytes)
```

**Tests:**
- Verify generateToken(16) produces 32-character hex string
- Statistical test: 10,000 tokens all unique

---

### MFA-TOTP-001 — Encrypt TOTP Secrets

**Files to modify:**
- `src/auth/repositories/mfa.repository.ts`
- `src/auth/services/mfa.service.ts`

**Changes:**
1. Add AES-256-GCM encryption/decryption helpers
2. Encrypt secret before storage
3. Decrypt before verification

**Implementation:**
```typescript
// src/auth/crypto/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY!, 'hex');

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}
```

**Verification:**
```bash
# Verify encryption
pnpm test -- --grep "TOTP encryption"

# Verify DB dump doesn't reveal secrets
mongosh --eval "db.mfa.findOne({}, {totpSecret: 1})"
# Should show encrypted value, not plaintext
```

**Tests:**
- Verify verifyTotpLogin works with encrypted secrets
- Verify DB dump does not reveal plaintext secrets

---

### RATE-001 — Add Refresh Endpoint Rate Limit

**Files to modify:**
- `src/app/api/auth/refresh/route.ts`

**Changes:**
```typescript
import { LoginAttemptRepository } from '@/auth/repositories/login-attempt.repository';

const rateLimitRepo = new LoginAttemptRepository();

export async function POST(request: Request) {
  const ip = getClientIp(request);
  
  // Check rate limit
  const isAllowed = await rateLimitRepo.checkLimit(`refresh:${ip}`, 60, 60);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // ... existing logic
}
```

**Verification:**
```bash
# Load test
for i in {1..61}; do
  curl -X POST https://your-domain.com/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refreshToken":"test"}'
done
# 61st request should return 429
```

**Tests:**
- Verify 429 returned when per-IP refresh limit exceeded
- Verify rate limit window resets after 60 seconds

---

### RATE-002 — Add TOTP Aggregate Rate Limit

**Files to modify:**
- `src/auth/actions/verify-totp.ts`

**Changes:**
```typescript
import { LoginAttemptRepository } from '@/auth/repositories/login-attempt.repository';

const rateLimitRepo = new LoginAttemptRepository();

export async function verifyTotpAction(formData: FormData) {
  // ... existing session check
  
  // Check per-user aggregate rate limit
  const userId = session.userId;
  const isAllowed = await rateLimitRepo.checkLimit(`totp:${userId}`, 10, 900);
  if (!isAllowed) {
    return { error: 'Too many TOTP attempts. Try again later.' };
  }
  
  // ... existing TOTP verification logic
}
```

**Verification:**
```bash
# Test per-user limit
for i in {1..11}; do
  curl -X POST https://your-domain.com/api/auth/verify-totp \
    -H "Content-Type: application/json" \
    -d '{"code":"000000"}'
done
# 11th request should fail
```

**Tests:**
- Verify block when per-user aggregate failures exceed limit

---

### AUTHZ-003 — Fix Mobile Admin Routes Authentication

**Files to modify:**
- `src/app/api/mobile/v1/admin/categories/route.ts`
- `src/app/api/mobile/v1/admin/products/route.ts`
- `src/app/api/mobile/v1/admin/products/[id]/route.ts`
- `src/app/api/mobile/v1/admin/sessions/revoke/route.ts`

**Changes:**
```typescript
import { authenticateBearerRequest } from '@/auth/lib/bearer';

export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  
  // ... existing logic using auth.userId
}
```

**Verification:**
```bash
# Test with valid bearer token
curl -H "Authorization: Bearer <valid-token>" \
  https://your-domain.com/api/mobile/v1/admin/categories

# Test without credentials (should return 401)
curl https://your-domain.com/api/mobile/v1/admin/categories
```

**Tests:**
- Test each mobile admin endpoint with valid bearer token
- Test without credentials (verify 401)
- Test with invalid token (verify 401)

---

### AUTHZ-005 — Fix revokeSessionAction Trust Boundary

**Files to modify:**
- `src/auth/actions/session.ts`

**Changes:**
```typescript
export async function revokeSessionAction(formData: FormData) {
  const session = await requireActiveSession();
  if (!session) {
    return { error: 'Authentication required' };
  }
  
  const targetSessionId = formData.get('sessionId') as string;
  
  // Use authenticated session for ownership verification
  const userId = session.userId;
  
  // ... existing revocation logic using userId
}
```

**Verification:**
```bash
# Test with authenticated session
curl -X POST https://your-domain.com/api/auth/revoke-session \
  -H "Cookie: session=<valid-session>" \
  -d "sessionId=<target-session>"

# Test without session (should return 401)
curl -X POST https://your-domain.com/api/auth/revoke-session \
  -d "sessionId=<target-session>"
```

**Tests:**
- Verify authenticated user cannot revoke another user's sessions
- Verify unauthenticated invocation rejected

---

### NEXT-008 — Add CSRF Guard to CMS Actions

**Files to modify:**
- `src/auth/actions/category.actions.ts`
- `src/auth/actions/product.actions.ts`

**Changes:**
```typescript
import { withCsrfGuard } from '@/auth/lib/csrf';

export const createCategory = withCsrfGuard(async (data: CategoryData) => {
  // ... existing logic
});

export const updateCategory = withCsrfGuard(async (id: string, data: CategoryData) => {
  // ... existing logic
});

export const deleteCategory = withCsrfGuard(async (id: string) => {
  // ... existing logic
});
```

**Verification:**
```bash
# Test cross-origin request
curl -X POST https://your-domain.com/api/category \
  -H "Origin: https://evil.com" \
  -d '{"name":"test"}'
# Should return 403
```

**Tests:**
- Verify cross-origin requests to these actions rejected

---

### OPS-002 — Add NODE_ENV Guard to Mailer

**Files to modify:**
- `src/auth/services/mailer.ts`

**Changes:**
```typescript
export async function sendMail(options: MailOptions) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email provider not configured in production');
    }
    
    // Dev fallback - log without sensitive content
    console.log('[DEV] Email would be sent to:', options.to);
    console.log('[DEV] Subject:', options.subject);
    // DO NOT log body with 2FA codes or reset links
    return;
  }
  
  // ... existing production logic
}
```

**Verification:**
```bash
# Test in production mode
NODE_ENV=production pnpm test -- --grep "mailer"

# Verify no email content logged
NODE_ENV=production pnpm test:load -- --endpoint /api/auth/login
# Check logs for absence of 2FA codes or reset links
```

**Tests:**
- Verify no email content logged in production mode
- Verify error thrown when email provider missing in production

---

### OPS-003 — Fix Database Config Error Message

**Files to modify:**
- `src/database/config.ts`

**Changes:**
```typescript
try {
  // ... connection logic
} catch (error) {
  // Safe error message - only include scheme, not credentials
  const scheme = MONGODB_URI.split('://')[0] || 'mongodb';
  throw new Error(`Database connection failed (${scheme}://...)`);
}
```

**Verification:**
```bash
# Test with invalid URI
MONGODB_URI=mongodb://admin:password123@host:27017/db pnpm test -- --grep "database config"

# Verify error doesn't contain password
# Error message should show: Database connection failed (mongodb://...)
```

**Tests:**
- Verify error message does not contain password from MONGODB_URI

---

### OPS-004 — Add SECURITY_WEBHOOK_URL Startup Warning

**Files to modify:**
- `src/auth/config/env.ts`

**Changes:**
```typescript
export function getEnv() {
  // ... existing validation
  
  // Security webhook warning
  if (process.env.NODE_ENV === 'production' && !process.env.SECURITY_WEBHOOK_URL) {
    console.warn(
      '[SECURITY] SECURITY_WEBHOOK_URL not set. ' +
      'Security events will be logged to console only. ' +
      'Configure SECURITY_WEBHOOK_URL for production alerting.'
    );
  }
  
  // ... existing return
}
```

**Verification:**
```bash
# Test warning
SECURITY_WEBHOOK_URL= pnpm test -- --grep "env validation"

# Verify warning emitted
# Should see: [SECURITY] SECURITY_WEBHOOK_URL not set...
```

**Tests:**
- Verify warning when SECURITY_WEBHOOK_URL unset in production

---

### OPS-007 — Add pnpm audit to CI

**Files to modify:**
- `.github/workflows/ci.yml` (or equivalent CI config)

**Changes:**
```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=critical
```

**Verification:**
```bash
# Local verification
pnpm audit --audit-level=critical

# CI verification
# Check CI workflow runs pnpm audit on every PR
```

**Tests:**
- CI workflow runs pnpm audit --audit-level=critical
- Critical vulnerabilities block deployment

---

## P2 — Medium (Fix Within 30 Days)

Fix within 1 month. Estimated total effort: 3-5 days.

| ID | Finding | Files | Changes | Effort |
|----|---------|-------|---------|--------|
| PWD-001 | Increase Argon2id parallelism | `src/auth/crypto/password.ts` | Change parallelism from 1 to 4 | S |
| PWD-002 | Addressed by PWD-001 | - | - | - |
| PWD-006 | Move status checks after password verify | `src/auth/services/login.service.ts` | Reorder checks, add dummy verify | S |
| OAUTH-003 | Add email_verified check | `src/auth/services/oauth.service.ts` | Add profile.email_verified validation | S |
| OAUTH-004 | Conditionally require GOOGLE_REDIRECT_URI | `src/auth/config/env.ts` | Add to validateSecurityConfig | S |
| OAUTH-017 | Add audit trail for linking | `src/auth/repositories/oauth-account.repository.ts` | Log auth.oauth.linked events | S |
| MFA-TOTP-003 | Add per-user TOTP rate limit | `src/auth/services/mfa.service.ts` | Implement failure counter | S |
| MFA-TOTP-004 | Add TOTP-specific lockout | `src/auth/services/mfa.service.ts` | Implement 5-per-15-min lockout | S |
| MFA-BYPASS-003 | Add trusted device expiry | `src/auth/repositories/device.repository.ts` | Set trustedUntil to 90 days | M |
| RATE-005 | Normalize IPv6 addresses | `src/auth/lib/request.ts` | Add IPv6 normalization | S |
| RATE-007 | Add daily reset cap | `src/auth/actions/password-reset.ts` | Implement 15-per-24-hour limit | S |
| RATE-010 | Add WebAuthn rate limit | `src/app/api/auth/webauthn/login-options/route.ts` | Add per-IP limit | S |
| DEPLOY-010 | Fix DB config error message | `src/database/config.ts` | Remove URI slice | S |
| DEPLOY-015 | Verify CORS fail-closed | `src/auth/config/env.ts` | Test empty array behavior | S |
| OPS-005 | Extend login_attempts TTL | `src/database/indexes/login-attempts.indexes.ts` | Change from 86400 to 604800 | S |
| OPS-010 | Forward mail failures to alerting | `src/auth/services/mailer.ts` | Add alerting sink call | S |

---

## P3 — Low (Backlog)

Fix as capacity allows. Estimated total effort: 5-7 days.

| ID | Finding | Effort |
|----|---------|--------|
| PWD-003 | Enforce pepper in non-production | S |
| PWD-005 | Add complexity requirements | S |
| PWD-008 | Cap maximum lock duration | M |
| PWD-009 | Replace Math.random with crypto | S |
| PWD-010 | Document session ID derivation | S |
| RST-002 | Add robots:noindex to reset page | S |
| RST-003 | Hash token in rate-limit identifier | S |
| RST-005 | Unify rate-limit layers | S |
| RST-006 | Hash token in completion rate-limit | S |
| RST-013 | Verify pending cookie options | S |
| OAUTH-002 | Use timingSafeEqual for state | S |
| OAUTH-005 | Filter JWKS by kty and use | S |
| OAUTH-006 | Document per-IP rate limit design | S |
| OAUTH-008 | Add iat validation | S |
| OAUTH-016 | Document linking policy | S |
| OAUTH-018 | Document Google revocation | S |
| OAUTH-020 | Validate user existence in link() | S |
| MFA-OTP-001 | Pass type to redeem() | S |
| MFA-OTP-002 | Pass IP to sendCode() | S |
| MFA-TOTP-002 | Add no-cache to QR response | S |
| MFA-TOTP-005 | Log server time difference | S |
| NEXT-005 | Restrict health endpoint | S |
| NEXT-006 | Remove test-cookies endpoint | S |
| NEXT-017 | Add CSRF to contact form | S |
| NEXT-021 | Review public site CSP | S |
| RATE-003 | Separate recovery code counter | S |
| RATE-006 | Document cross-account enumeration | S |
| RATE-008 | Document race window | M |
| RATE-009 | Move spike detection to MongoDB | M |
| DEPLOY-013 | Extend Permissions-Policy | S |
| OPS-006 | Document serverless limitation | S |
| OPS-008 | Verify audit log retention | S |
| OPS-011 | Add startup banner | S |

---

## Implementation Order

### Week 1: Production Blockers
1. OPS-001/NEXT-019: Remove debug file writes (1 hour)
2. DEPLOY-001: Configure HSTS (2 hours)
3. PWD-007/RATE-004: Verify boot guard (2 hours)
4. OAUTH-015: Add unique indexes (3 hours)

### Week 2: Critical Security Fixes
1. PWD-004: Fix timing side-channel (2 hours)
2. RATE-001: Add refresh rate limit (3 hours)
3. RATE-002: Add TOTP rate limit (3 hours)
4. RST-001: Increase token entropy (1 hour)
5. MFA-TOTP-001: Encrypt TOTP secrets (4 hours)

### Week 3: High-Priority Fixes
1. AUTHZ-003: Fix mobile admin auth (4 hours)
2. AUTHZ-005: Fix revokeSessionAction (2 hours)
3. NEXT-008: Add CSRF guards (2 hours)
4. OPS-002: Add mailer NODE_ENV guard (1 hour)
5. OPS-003: Fix DB config error (1 hour)
6. OPS-004: Add webhook warning (1 hour)
7. OPS-007: Add pnpm audit to CI (2 hours)

### Week 4: Medium-Priority Fixes
- Address all P2 items (estimated 3-5 days)

### Ongoing: Low-Priority Fixes
- Address P3 items as capacity allows

---

## Verification Commands

After implementing fixes, run:

```bash
# Lint and typecheck
pnpm lint
pnpm build

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Security checks
pnpm docs:check
pnpm test:api-contract

# Manual verification
grep -r "appendFileSync\|debug-verify" src/  # Should return zero
curl -I https://your-domain.com | grep -i strict-transport  # Should return HSTS header
```

---

## Risk Tracking

| Risk | Mitigation | Status |
|------|------------|--------|
| Boot guard bypass | Verify in staging | Pending |
| TOTP encryption key management | Use HSM or cloud KMS | Pending |
| Edge HSTS configuration | Document in deployment guide | Pending |
| Serverless rate-limit race | Accept known limitation | Documented |
