# 20 — Pre-Production Action Plan

**Audit Date:** 2026-07-28
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

---

## Overview

This document details the 6 P1 (High) findings that should be remediated before production deployment. Each item includes file paths, code changes, and verification steps.

**Total estimated effort:** 4–6 hours

---

## FINDING-01 — Fix OAuth Refresh Cookie SameSite Inconsistency

**File:** `src/app/api/auth/google/callback/route.ts`

**Problem:** The `cws_refresh` cookie is set with `SameSite: 'lax'` in the OAuth callback but `SameSite: 'strict'` everywhere else.

**Evidence:** `src/app/api/auth/google/callback/route.ts:151-157`

**Fix:**

```typescript
// Line 152 — Change:
sameSite: 'lax',
// To:
sameSite: 'strict',
```

Or refactor to use the shared `setAuthCookies()` function.

**Verification:**

```bash
# Verify all refresh cookie settings use 'strict'
grep -rn "sameSite.*lax" src/app/api/auth/
# Should return zero matches
```

**Tests:**
- Verify refresh cookie SameSite is `'strict'` after OAuth login
- Verify refresh cookie SameSite is `'strict'` after password login

---

## FINDING-02 — Add Sudo Mode for TOTP Re-enrollment

**File:** `src/auth/actions/mfa.ts`

**Problem:** `verifyAndEnableTotpAction` calls `requireActiveSession()` but not `requireSudoMode()`. An attacker with a valid session could replace the victim's TOTP secret.

**Evidence:** `src/auth/actions/mfa.ts:35-46`

**Fix:**

```typescript
export async function verifyAndEnableTotpAction(formData: FormData) {
  const session = await requireActiveSession();
  if (!session) return { error: 'Authentication required' };

  // If TOTP is already enabled, require sudo mode (re-authentication)
  const existingTotp = await mfaRepository.findTotpByUserId(session.userId);
  if (existingTotp?.secret) {
    const sudoSession = await requireSudoMode();
    if (!sudoSession) {
      return { error: 'Password re-authentication required to change MFA settings' };
    }
  }

  // ... existing verification logic
}
```

**Verification:**

```bash
# Verify sudo mode check exists
grep -n "requireSudoMode" src/auth/actions/mfa.ts
# Should find match in verifyAndEnableTotpAction
```

**Tests:**
- Verify TOTP re-enrollment is rejected without sudo mode when TOTP is already enabled
- Verify first-time TOTP enrollment works with just active session
- Verify TOTP re-enrollment succeeds after password re-authentication

---

## FINDING-03 — Add Per-IP Rate Limit on Refresh Endpoint

**File:** `src/app/api/auth/refresh/route.ts`

**Problem:** No per-IP or per-token rate limit on session refresh endpoint. Flooding could exhaust MongoDB connection pool.

**Evidence:** `src/app/api/auth/refresh/route.ts:23-106`

**Fix:**

```typescript
import { LoginAttemptRepository } from '@/auth/repositories/login-attempt.repository';
import { getClientIp } from '@/auth/lib/request';

const rateLimitRepo = new LoginAttemptRepository();

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Per-IP rate limit: 60 requests per minute
  const isAllowed = await rateLimitRepo.checkLimit(`refresh:${ip}`, 60, 60);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // ... existing refresh logic
}
```

**Verification:**

```bash
# Verify rate limit check exists
grep -n "checkLimit" src/app/api/auth/refresh/route.ts
# Should find at least one match
```

**Tests:**
- Verify 429 returned when per-IP refresh limit exceeded
- Verify rate limit window resets after configured duration

---

## FINDING-04 — Verify TOTP_ENCRYPTION_KEY Boot Guard

**File:** `src/auth/config/env.ts`

**Problem:** `TOTP_ENCRYPTION_KEY` is required in production but boot guard enforcement was not explicitly verified.

**Evidence:** `src/auth/config/env.ts:11` (schema), `src/auth/services/mfa.ts` (usage)

**Fix:**

Verify or add explicit boot guard:

```typescript
// In validateSecurityConfig() or equivalent
if (process.env.NODE_ENV === 'production') {
  if (!process.env.TOTP_ENCRYPTION_KEY) {
    throw new Error('TOTP_ENCRYPTION_KEY is required in production');
  }
  if (process.env.TOTP_ENCRYPTION_KEY.length < 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must be at least 32 characters');
  }
}
```

**Verification:**

```bash
# Verify boot guard exists
grep -n "TOTP_ENCRYPTION_KEY" src/auth/config/env.ts
# Should find schema definition AND validation check

# Test fail-closed behavior
TOTP_ENCRYPTION_KEY= pnpm start
# Should refuse to boot in production
```

**Tests:**
- Verify production boot fails without `TOTP_ENCRYPTION_KEY`
- Verify production boot fails with key shorter than 32 characters

---

## FINDING-05 — Add Production Guard to Dev Mailer Fallback

**File:** `src/auth/services/mailer.ts`

**Problem:** When email env vars are not configured, the dev fallback logs full email content (2FA codes, reset links) to `console.info`.

**Evidence:** `src/auth/services/mailer.ts:52-54`

**Fix:**

```typescript
export async function sendMail(options: MailOptions) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Email provider not configured in production. ' +
        'Set EMAIL_USER and EMAIL_PASSWORD environment variables.'
      );
    }

    // Dev fallback — log without sensitive content
    console.info(`[mail:dev] to=${options.to} subject=${options.subject}`);
    // DO NOT log options.text (contains 2FA codes / reset links)
    return { messageId: 'dev-mode' };
  }

  // ... existing production logic
}
```

**Verification:**

```bash
# Verify no email content logging in production
NODE_ENV=production grep -n "console.info.*text" src/auth/services/mailer.ts
# Should return zero matches
```

**Tests:**
- Verify no email content logged in production mode
- Verify error thrown when email provider missing in production

---

## FINDING-06 — Remove Debug Filesystem Writes

**File:** `src/auth/actions/verify-2fa.ts`

**Problem:** `fs.appendFileSync` writes device IDs and trust state to `debug-verify.log`.

**Evidence:** `src/auth/actions/verify-2fa.ts:125-138`

**Fix:**

1. Remove the `import { appendFileSync } from 'fs'` (or dynamic import)
2. Remove all `appendFileSync` calls (lines ~125-138)
3. Remove any `debug-verify.log` references

**Verification:**

```bash
grep -rn "appendFileSync\|debug-verify" src/auth/actions/verify-2fa.ts
# Should return zero matches
```

**Tests:**
- Verify 2FA verification completes without filesystem writes
- Verify no debug log files created

---

## Implementation Order

### Hour 1: Quick Wins
1. FINDING-06: Remove debug file writes (10 min)
2. FINDING-05: Add production guard to mailer (15 min)
3. FINDING-01: Fix SameSite inconsistency (10 min)

### Hour 2: Security Enhancements
4. FINDING-04: Verify TOTP boot guard (20 min)
5. FINDING-02: Add sudo mode for TOTP re-enrollment (30 min)

### Hour 3–4: Rate Limiting
6. FINDING-03: Add refresh endpoint rate limit (1–2 hours)

---

## Verification Commands

After implementing all fixes:

```bash
# Lint and typecheck
pnpm lint
pnpm build

# Unit tests
pnpm test:unit

# Security checks
pnpm docs:check
pnpm test:api-contract

# Manual verification
grep -rn "appendFileSync\|debug-verify" src/  # Should return zero
grep -rn "sameSite.*lax" src/app/api/auth/    # Should return zero
grep -n "requireSudoMode" src/auth/actions/mfa.ts  # Should find match
grep -n "checkLimit" src/app/api/auth/refresh/route.ts  # Should find match
```
