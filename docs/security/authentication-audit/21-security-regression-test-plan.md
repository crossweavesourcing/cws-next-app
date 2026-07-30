# 21 — Security Regression Test Plan

**Audit Date:** 2026-07-27
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

---

## Overview

This document defines regression tests for every finding category to prevent security regressions after remediation. Tests are organized by finding category with specific test cases, expected results, and automation level.

---

## Test Categories

### 1. Password & Authentication (PWD-*)

#### PWD-001/PWD-002: Argon2id Parameters

**Test ID:** REG-PWD-001
**Type:** Unit Test
**Priority:** P1
**Automated:** Yes

```typescript
// src/auth/crypto/__tests__/password.test.ts
describe('Argon2id Parameters', () => {
  it('should use parallelism >= 4', async () => {
    const hash = await hashPassword('test-password');
    const params = parseArgon2Hash(hash);
    expect(params.parallelism).toBeGreaterThanOrEqual(4);
  });

  it('should use memoryCost >= 65536', async () => {
    const hash = await hashPassword('test-password');
    const params = parseArgon2Hash(hash);
    expect(params.memoryCost).toBeGreaterThanOrEqual(65536);
  });

  it('should verify old hashes with parallelism=1', async () => {
    // Hash created with old parameters
    const oldHash = '$argon2id$v=19$m=65536,t=3,p=1$...';
    const result = await verifyPassword('test-password', oldHash);
    expect(result).toBe(true);
  });
});
```

**Verification:**
```bash
pnpm test:unit -- --grep "Argon2id Parameters"
```

---

#### PWD-004: Login Timing Mitigation

**Test ID:** REG-PWD-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
// src/auth/services/__tests__/login-timing.test.ts
describe('Login Timing Mitigation', () => {
  it('should have consistent timing distribution', async () => {
    const timings: number[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const start = Date.now();
      await loginWithTiming('test@example.com', 'wrong-password');
      timings.push(Date.now() - start);
    }
    
    // Calculate statistics
    const avg = timings.reduce((a, b) => a + b) / timings.length;
    const stdDev = Math.sqrt(
      timings.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / timings.length
    );
    
    // Standard deviation should be reasonable (not too high)
    expect(stdDev).toBeLessThan(avg * 0.5);
  });
});
```

**Verification:**
```bash
pnpm test:unit -- --grep "Login Timing Mitigation"
```

---

#### PWD-006: Account Status Timing

**Test ID:** REG-PWD-003
**Type:** Integration Test
**Priority:** P2
**Automated:** Yes

```typescript
describe('Account Status Timing', () => {
  it('should have consistent timing for deleted vs not found', async () => {
    const notFoundTimings: number[] = [];
    const deletedTimings: number[] = [];
    
    // Test with non-existent email
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await loginWithTiming('nonexistent@example.com', 'password');
      notFoundTimings.push(Date.now() - start);
    }
    
    // Test with deleted account
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await loginWithTiming('deleted@example.com', 'password');
      deletedTimings.push(Date.now() - start);
    }
    
    // Averages should be similar
    const avgNotFound = notFoundTimings.reduce((a, b) => a + b) / notFoundTimings.length;
    const avgDeleted = deletedTimings.reduce((a, b) => a + b) / deletedTimings.length;
    
    expect(Math.abs(avgNotFound - avgDeleted)).toBeLessThan(50);
  });
});
```

---

### 2. Password Recovery (RST-*)

#### RST-001: Reset Token Entropy

**Test ID:** REG-RST-001
**Type:** Unit Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('Reset Token Entropy', () => {
  it('should generate tokens with >= 128 bits entropy', async () => {
    const token = await generateResetToken();
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    
    // Verify randomness
    const tokens = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      tokens.add(await generateResetToken());
    }
    expect(tokens.size).toBe(10000);
  });
});
```

**Verification:**
```bash
pnpm test:unit -- --grep "Reset Token Entropy"
```

---

#### RST-004: Reset Token Atomic Redemption

**Test ID:** REG-RST-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('Reset Token Atomic Redemption', () => {
  it('should only allow one concurrent redemption', async () => {
    const token = await createResetToken('user-id');
    
    // Fire 10 concurrent redemption requests
    const results = await Promise.allSettled(
      Array(10).fill(null).map(() => redeemResetToken(token, 'new-password'))
    );
    
    // Only one should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success);
    expect(succeeded).toHaveLength(1);
  });
});
```

---

### 3. Google OAuth (OAUTH-*)

#### OAUTH-001: Clock Skew Leeway

**Test ID:** REG-OAUTH-001
**Type:** Unit Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('OAuth Clock Skew', () => {
  it('should accept tokens within 5-minute leeway', async () => {
    const token = createMockIdToken({
      exp: Math.floor(Date.now() / 1000) - 299, // 299 seconds ago
    });
    
    const result = await verifyGoogleToken(token);
    expect(result.valid).toBe(true);
  });

  it('should reject tokens beyond 5-minute leeway', async () => {
    const token = createMockIdToken({
      exp: Math.floor(Date.now() / 1000) - 301, // 301 seconds ago
    });
    
    const result = await verifyGoogleToken(token);
    expect(result.valid).toBe(false);
  });
});
```

---

#### OAUTH-015: Unique Index Enforcement

**Test ID:** REG-OAUTH-002
**Type:** Integration Test
**Priority:** P0
**Automated:** Yes

```typescript
describe('OAuth Unique Index', () => {
  it('should prevent duplicate (provider, providerAccountId) links', async () => {
    await linkOAuthAccount('user-1', 'google', 'account-123');
    
    // Attempt duplicate link
    const result = await linkOAuthAccount('user-2', 'google', 'account-123');
    
    // Should either update existing or reject
    const links = await findOAuthLinks('google', 'account-123');
    expect(links).toHaveLength(1);
  });

  it('should handle concurrent link attempts', async () => {
    const results = await Promise.allSettled([
      linkOAuthAccount('user-1', 'google', 'account-123'),
      linkOAuthAccount('user-2', 'google', 'account-123'),
    ]);
    
    const links = await findOAuthLinks('google', 'account-123');
    expect(links).toHaveLength(1);
  });
});
```

---

### 4. Email OTP (MFA-OTP-*)

#### MFA-OTP-001: Token Type Filtering

**Test ID:** REG-MFA-OTP-001
**Type:** Unit Test
**Priority:** P2
**Automated:** Yes

```typescript
describe('OTP Token Type Filtering', () => {
  it('should only redeem two_factor type tokens', async () => {
    const passwordResetToken = await createVerificationToken('password_reset');
    
    // Attempt to redeem with OTP verification
    const result = await redeemOtpToken(passwordResetToken);
    
    // Should fail - wrong type
    expect(result.success).toBe(false);
  });
});
```

---

### 5. TOTP Authenticator (MFA-TOTP-*)

#### MFA-TOTP-001: TOTP Secret Encryption

**Test ID:** REG-MFA-TOTP-001
**Type:** Unit Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('TOTP Secret Encryption', () => {
  it('should store encrypted secrets in database', async () => {
    const userId = 'test-user';
    const secret = 'JBSWY3DPEHPK3PXP';
    
    await saveTotpSecret(userId, secret);
    
    // Direct database query
    const raw = await db.mfa.findOne({ userId });
    expect(raw.totpSecret).not.toBe(secret);
    expect(raw.totpSecret).toMatch(/^[a-f0-9:]+$/); // encrypted format
  });

  it('should decrypt secrets for verification', async () => {
    const userId = 'test-user';
    const secret = 'JBSWY3DPEHPK3PXP';
    
    await saveTotpSecret(userId, secret);
    
    // Generate valid TOTP code
    const code = generateTotpCode(secret);
    
    // Verify should work
    const result = await verifyTotpLogin(userId, code);
    expect(result.success).toBe(true);
  });
});
```

---

#### MFA-TOTP-003/MFA-TOTP-004: TOTP Rate Limiting

**Test ID:** REG-MFA-TOTP-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('TOTP Rate Limiting', () => {
  it('should block after 5 failures per 15 minutes', async () => {
    const userId = 'test-user';
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await verifyTotpLogin(userId, '000000');
    }
    
    // 6th attempt should be blocked
    const result = await verifyTotpLogin(userId, '123456');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many attempts');
  });

  it('should reset after 15 minutes', async () => {
    const userId = 'test-user';
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await verifyTotpLogin(userId, '000000');
    }
    
    // Fast-forward time (mock)
    jest.advanceTimersByTime(15 * 60 * 1000);
    
    // Should be able to try again
    const result = await verifyTotpLogin(userId, '123456');
    expect(result.success).toBe(true); // assuming correct code
  });
});
```

---

### 6. MFA Recovery & Bypass (MFA-BYPASS-*)

#### MFA-BYPASS-001/MFA-BYPASS-002: MFA Reauthentication

**Test ID:** REG-MFA-BYPASS-001
**Type:** Integration Test
**Priority:** P0
**Automated:** Yes

```typescript
describe('MFA Reauthentication', () => {
  it('should require password to disable TOTP', async () => {
    const session = await createAuthenticatedSession('user-with-totp');
    
    // Attempt without password
    const result = await disableTotp(session.id, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Password required');
  });

  it('should require current TOTP to replace', async () => {
    const session = await createAuthenticatedSession('user-with-totp');
    
    // Attempt replacement without current TOTP
    const result = await replaceTotp(session.id, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Current TOTP required');
  });
});
```

---

### 7. Session Security (SESSION-*)

#### SESSION-019: Atomic Refresh Rotation

**Test ID:** REG-SESSION-001
**Type:** Integration Test
**Priority:** P0
**Automated:** Yes

```typescript
describe('Atomic Refresh Rotation', () => {
  it('should prevent concurrent refresh token reuse', async () => {
    const refreshToken = await createRefreshToken('user-1');
    
    // Fire 10 concurrent refresh requests
    const results = await Promise.allSettled(
      Array(10).fill(null).map(() => refreshSession(refreshToken))
    );
    
    // Only one should succeed
    const succeeded = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    );
    expect(succeeded).toHaveLength(1);
    
    // Others should trigger revocation
    const session = await getSession('user-1');
    expect(session.revoked).toBe(true);
  });
});
```

---

#### SESSION-020: Device Binding

**Test ID:** REG-SESSION-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('Device Binding', () => {
  it('should reject refresh from different device', async () => {
    const { refreshToken, deviceId } = await createRefreshToken('user-1');
    
    // Attempt refresh from different device
    const result = await refreshSession(refreshToken, 'different-device-id');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Device mismatch');
    
    // Verify alert triggered
    const alerts = await getSecurityAlerts('user-1');
    expect(alerts).toContainEqual(expect.objectContaining({
      type: 'device_mismatch',
    }));
  });
});
```

---

### 8. Authorization (AUTHZ-*)

#### AUTHZ-003: Mobile Admin Authentication

**Test ID:** REG-AUTHZ-001
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('Mobile Admin Authentication', () => {
  it('should require bearer token for mobile admin routes', async () => {
    const routes = [
      '/api/mobile/v1/admin/categories',
      '/api/mobile/v1/admin/products',
      '/api/mobile/v1/admin/sessions/revoke',
    ];
    
    for (const route of routes) {
      const result = await fetch(route, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' },
      });
      
      expect(result.status).toBe(401);
    }
  });

  it('should accept valid bearer token', async () => {
    const token = await createMobileAccessToken('admin-user');
    
    const result = await fetch('/api/mobile/v1/admin/categories', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    expect(result.status).toBe(200);
  });
});
```

---

### 9. Next.js Security (NEXT-*)

#### NEXT-008: CSRF Guard

**Test ID:** REG-NEXT-001
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('CSRF Guard', () => {
  it('should reject cross-origin requests', async () => {
    const result = await fetch('/api/category', {
      method: 'POST',
      headers: {
        'Origin': 'https://evil.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test' }),
    });
    
    expect(result.status).toBe(403);
  });

  it('should accept same-origin requests', async () => {
    const csrfToken = await getCsrfToken();
    
    const result = await fetch('/api/category', {
      method: 'POST',
      headers: {
        'Origin': 'https://your-domain.com',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ name: 'test' }),
    });
    
    expect(result.status).toBe(200);
  });
});
```

---

### 10. Abuse Prevention (RATE-*)

#### RATE-001: Refresh Endpoint Rate Limit

**Test ID:** REG-RATE-001
**Type:** Load Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('Refresh Rate Limit', () => {
  it('should limit to 60 requests per minute per IP', async () => {
    const results = [];
    
    for (let i = 0; i < 61; i++) {
      const result = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'test' }),
      });
      results.push(result.status);
    }
    
    // First 60 should succeed (or fail with 401)
    // 61st should return 429
    expect(results[60]).toBe(429);
  });
});
```

---

#### RATE-002: TOTP Aggregate Rate Limit

**Test ID:** REG-RATE-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('TOTP Aggregate Rate Limit', () => {
  it('should limit to 10 failures per 15 minutes per user', async () => {
    const userId = 'test-user';
    
    // Create multiple pending sessions
    for (let i = 0; i < 3; i++) {
      await createPendingSession(userId);
    }
    
    // Attempt 11 TOTP verifications across sessions
    const results = [];
    for (let i = 0; i < 11; i++) {
      const result = await verifyTotp(`pending-session-${i % 3}`, '000000');
      results.push(result.success);
    }
    
    // Should be blocked after 10 failures
    expect(results.filter(r => r === false)).toHaveLength(10);
    expect(results[10]).toBe(false);
  });
});
```

---

### 11. Secrets & Deployment (DEPLOY-*)

#### DEPLOY-001: HSTS Header

**Test ID:** REG-DEPLOY-001
**Type:** E2E Test
**Priority:** P0
**Automated:** Yes

```typescript
describe('HSTS Header', () => {
  it('should include Strict-Transport-Security header', async () => {
    const response = await fetch('https://your-domain.com/dashboard', {
      redirect: 'manual',
    });
    
    const hsts = response.headers.get('strict-transport-security');
    expect(hsts).toBeTruthy();
    expect(hsts).toContain('max-age=63072000');
    expect(hsts).toContain('includeSubDomains');
  });
});
```

---

### 12. Operational Security (OPS-*)

#### OPS-001: No Debug File Writes

**Test ID:** REG-OPS-001
**Type:** Static Analysis
**Priority:** P0
**Automated:** Yes

```bash
#!/bin/bash
# scripts/check-no-debug-writes.sh

# Check for appendFileSync
if grep -r "appendFileSync" src/; then
  echo "FAIL: appendFileSync found in src/"
  exit 1
fi

# Check for debug-verify.log
if grep -r "debug-verify" src/; then
  echo "FAIL: debug-verify reference found in src/"
  exit 1
fi

# Check for fs import in verify-2fa.ts
if grep -q "from 'fs'" src/auth/actions/verify-2fa.ts; then
  echo "FAIL: fs import found in verify-2fa.ts"
  exit 1
fi

echo "PASS: No debug file writes found"
exit 0
```

**Verification:**
```bash
pnpm test:security
```

---

#### OPS-002: No Email Content Logging

**Test ID:** REG-OPS-002
**Type:** Integration Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('No Email Content Logging', () => {
  it('should not log 2FA codes in production', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Trigger 2FA email
    await send2FAEmail('test@example.com', '123456');
    
    // Check no code logged
    const codeLogged = consoleSpy.mock.calls.some(
      call => call.some(arg => 
        typeof arg === 'string' && arg.includes('123456')
      )
    );
    
    expect(codeLogged).toBe(false);
    
    consoleSpy.mockRestore();
  });
});
```

---

#### OPS-003: No Credential Leakage

**Test ID:** REG-OPS-003
**Type:** Unit Test
**Priority:** P1
**Automated:** Yes

```typescript
describe('No Credential Leakage', () => {
  it('should not include password in error messages', async () => {
    const uri = 'mongodb://admin:supersecret@host:27017/db';
    
    try {
      await connectToDatabase(uri);
    } catch (error) {
      expect(error.message).not.toContain('supersecret');
      expect(error.message).toContain('mongodb://');
    }
  });
});
```

---

## Test Execution

### Local Development

```bash
# Run all regression tests
pnpm test:unit -- --grep "REG-"
pnpm test:e2e -- --grep "REG-"

# Run specific category
pnpm test:unit -- --grep "REG-PWD"
pnpm test:unit -- --grep "REG-OAUTH"
pnpm test:unit -- --grep "REG-MFA"
pnpm test:unit -- --grep "REG-SESSION"
pnpm test:unit -- --grep "REG-AUTHZ"
pnpm test:unit -- --grep "REG-NEXT"
pnpm test:unit -- --grep "REG-RATE"
pnpm test:unit -- --grep "REG-DEPLOY"
pnpm test:unit -- --grep "REG-OPS"
```

### CI Pipeline

```yaml
# .github/workflows/security-regression.yml
name: Security Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  security-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --grep "REG-"
      - run: pnpm test:e2e -- --grep "REG-"
      - run: bash scripts/check-no-debug-writes.sh
```

---

## Test Coverage Requirements

| Category | Minimum Coverage | Target Coverage |
|----------|------------------|-----------------|
| Password & Authentication | 80% | 95% |
| Password Recovery | 80% | 95% |
| Google OAuth | 80% | 95% |
| Account Linking | 70% | 90% |
| Email OTP | 70% | 90% |
| TOTP Authenticator | 80% | 95% |
| MFA Recovery & Bypass | 90% | 100% |
| Session Security | 90% | 100% |
| Authorization | 85% | 95% |
| Next.js Security | 75% | 90% |
| Abuse Prevention | 80% | 95% |
| Secrets & Deployment | 85% | 95% |
| Operational Security | 80% | 95% |

---

## Monitoring & Alerting

After deploying fixes, monitor:

1. **Rate limit triggers** — Ensure 429 responses are logged
2. **HSTS header** — Verify present on all admin routes
3. **Debug file writes** — Alert if any appendFileSync detected
4. **Email content logging** — Alert if 2FA codes appear in logs
5. **Credential leakage** — Scan error messages for URI patterns
6. **Token reuse** — Monitor for refresh token reuse attempts
7. **Device mismatches** — Alert on device binding failures
8. **MFA bypass attempts** — Monitor for disable/replace without reauth

---

## Maintenance

### Monthly Review

1. Review test coverage reports
2. Update test cases for new findings
3. Verify regression tests still pass
4. Review monitoring alerts for false positives

### Quarterly Review

1. Update test parameters based on threat landscape
2. Review and update rate limits
3. Audit test effectiveness
4. Update this document with new test cases

---

## Appendix: Test Data

### Mock Users

```typescript
// src/test/fixtures/users.ts
export const testUsers = {
  active: { id: 'user-active', status: 'active', email: 'active@test.com' },
  suspended: { id: 'user-suspended', status: 'suspended', email: 'suspended@test.com' },
  deleted: { id: 'user-deleted', status: 'deleted', email: 'deleted@test.com' },
  withTotp: { id: 'user-totp', totpEnabled: true, email: 'totp@test.com' },
  withWebauthn: { id: 'user-webauthn', webauthnEnabled: true, email: 'webauthn@test.com' },
};
```

### Mock Tokens

```typescript
// src/test/fixtures/tokens.ts
export const testTokens = {
  validRefresh: 'valid-refresh-token-123',
  expiredRefresh: 'expired-refresh-token-456',
  reusedRefresh: 'reused-refresh-token-789',
  validTotp: '123456',
  invalidTotp: '000000',
};
```
