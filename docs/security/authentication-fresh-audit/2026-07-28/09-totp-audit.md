# 09 — TOTP Authenticator App Implementation Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | TOTP enrollment, verification, encryption, replay prevention, management |
| Standards | OWASP ASVS 2.8 (One-Time Verifier), RFC 6238, NIST SP 800-63B |

## 1. Architecture Overview

TOTP (Time-based One-Time Password) is implemented using the `otplib` library (v13.4.1) with the `NobleCryptoPlugin` (noble-hashes) backend. TOTP secrets are encrypted at rest using AES-256-GCM.

### 1.1 Key Components

| Component | File | Purpose |
|---|---|---|
| `MfaService` | `src/auth/services/mfa.service.ts` | TOTP generation, verification, enable/disable |
| `MfaRepository` | `src/auth/repositories/mfa.repository.ts` | Secret storage with encryption |
| `mfa.ts` actions | `src/auth/actions/mfa.ts` | Server Actions for TOTP management |
| `verify-totp.ts` | `src/auth/actions/verify-totp.ts` | Login TOTP verification |
| `encryption.ts` | `src/auth/lib/encryption.ts` | AES-256-GCM encrypt/decrypt |
| `totp_credentials` schema | `src/database/schemas/totp-credentials.schema.ts` | Document structure |

## 2. Enrollment Flow

### 2.1 Secret Generation

`MfaService.generateTotpSecret()` (`mfa.service.ts:78-82`):
```typescript
const secret = totp.generateSecret();
const otpauthUrl = totp.toURI({ label: userEmail, issuer: rpName, secret });
```

`otplib`'s `generateSecret()` produces a 20-byte (160-bit) secret encoded in base32. This provides sufficient entropy (2^160 possibilities).

**Finding TOTP-001: Secret generation uses otplib with 160-bit entropy.**
- **Severity:** N/A (pass)
- **Rationale:** 160 bits exceeds NIST SP 800-63B minimum requirements for TOTP secrets.

### 2.2 Secret Encryption at Rest

`MfaRepository.saveTotpSecret()` (`mfa.repository.ts:21-41`):
```typescript
secret: encrypt(secret),
```

The `encrypt()` function (`mfa.repository.ts:7-11`):
```typescript
function encrypt(secret: string): string {
  const key = getEnv().TOTP_ENCRYPTION_KEY;
  if (!key) return secret;
  return encryptSymmetric(secret, key);
}
```

**AES-256-GCM** is used (`encryption.ts:12`):
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **IV:** 96-bit random (`crypto.randomBytes(12)`)
- **Auth tag:** GCM authentication tag prevents ciphertext tampering
- **Key format:** 64 hex characters (32 bytes)
- **Payload format:** `v1:<ivHex>:<authTagHex>:<ciphertextHex>`

**Finding TOTP-002: TOTP secrets are encrypted with AES-256-GCM at rest.**
- **Severity:** N/A (pass)
- **Rationale:** Authenticated encryption (GCM) provides both confidentiality and integrity. The v1 prefix enables future key rotation.

### 2.3 Encryption Key Management

`env.ts:11`:
```typescript
TOTP_ENCRYPTION_KEY: z.string().length(64).optional(),
```

In production (`env.ts:159`):
```typescript
if (!env.TOTP_ENCRYPTION_KEY?.trim()) missing.push('TOTP_ENCRYPTION_KEY');
```

**Finding TOTP-003: TOTP_ENCRYPTION_KEY is required in production.**
- **Severity:** N/A (pass)
- **Rationale:** The boot guard refuses to start in production without the key.

### 2.4 Dev-Mode Plaintext Fallback

When `TOTP_ENCRYPTION_KEY` is not set (`mfa.repository.ts:9`):
```typescript
if (!key) return secret;  // plaintext!
```

And for decryption (`mfa.repository.ts:14`):
```typescript
if (!payload.startsWith('v1:')) return payload; // Legacy plaintext
```

**Finding TOTP-004: TOTP secrets stored in plaintext when encryption key is missing (dev only).**
- **Severity:** Low (dev-only)
- **Rationale:** Production requires the key. The dev fallback allows local development without encryption setup. The `v1:` prefix detection distinguishes encrypted from plaintext.

### 2.5 QR Code Delivery

The QR code URL (otpauth://) is returned from the `generateTotpSecretAction` Server Action. The HTTP route serving the QR code sets:
```
Cache-Control: no-store
```

**Finding TOTP-005: QR code delivery prevents caching.**
- **Severity:** N/A (pass)
- **Rationale:** The `no-store` directive prevents browsers/proxies from caching the TOTP secret URL.

### 2.6 Enrollment Authentication

`generateTotpSecretAction` calls `requireActiveSession()` — the user must be fully authenticated (session valid, not in forced-password-change state).

**Finding TOTP-006: Enrollment requires active authenticated session.**
- **Severity:** N/A (pass)

### 2.7 TOTP Not Enabled Before Confirmation

`MfaService.verifyAndEnableTotp()` (`mfa.service.ts:88-95`):
```typescript
async verifyAndEnableTotp(userId: ObjectId, secret: string, token: string): Promise<boolean> {
  const result = await totp.verify(token, { secret });
  if (!result.valid) return false;
  await this.mfaRepo.saveTotpSecret(userId, secret);
  await this.userRepo.updateSecurity(userId, { totpEnabled: true, mfaEnabled: true });
  return true;
}
```

TOTP is **not enabled** (`totpEnabled: false`) until the user successfully verifies a code using the newly generated secret. This prevents a user from enabling TOTP without a working authenticator app.

**Finding TOTP-007: TOTP requires successful code verification before enablement.**
- **Severity:** N/A (pass)

### 2.8 Abandoned Enrollment Cleanup

There is no explicit cleanup mechanism for abandoned enrollments. If a user generates a TOTP secret but never completes verification:
- The secret is stored in `totp_credentials` (encrypted)
- `totpEnabled` remains `false`
- The secret is overwritten if the user re-initiates enrollment

**Finding TOTP-008: No explicit cleanup for abandoned TOTP enrollments.**
- **Severity:** Low
- **Rationale:** The secret is encrypted at rest and never used for verification until `totpEnabled` is set. The next enrollment overwrites the old secret. Consider adding a TTL-based cleanup for unverified TOTP credentials.

## 3. Verification Flow

### 3.1 RFC 6238 Compliance

`MfaService.verifyTotpLogin()` (`mfa.service.ts:100-113`):
```typescript
const result = await totp.verify(token, {
  secret: credential.secret,
  period: TOTP_PERIOD_SECONDS,  // 30 seconds
  afterTimeStep: credential.lastAcceptedTimeStep ?? undefined,
});
```

The `otplib` TOTP instance (`mfa.service.ts:21-24`) is configured with:
- `NobleCryptoPlugin` (noble-hashes) for HMAC-SHA-1
- `ScureBase32Plugin` for base32 encoding
- Default digits: 6
- Period: 30 seconds

**Finding TOTP-009: TOTP verification uses otplib with RFC 6238 parameters.**
- **Severity:** N/A (pass)

### 3.2 Replay Prevention

`afterTimeStep` parameter ensures codes from time steps at or before `lastAcceptedTimeStep` are rejected. After a successful verification, the accepted time step is persisted:

`MfaRepository.markTotpTimeStepAccepted()` (`mfa.repository.ts:58-77`):
```typescript
const result = await coll.updateOne(
  {
    userId,
    $or: [
      { lastAcceptedTimeStep: null },
      { lastAcceptedTimeStep: { $exists: false } },
      { lastAcceptedTimeStep: { $lt: timeStep } },
    ],
  },
  { $set: { lastAcceptedTimeStep: timeStep, updatedAt: new Date() } },
);
return result.modifiedCount === 1;
```

The atomic `$lt` comparison prevents two concurrent verifications from both succeeding for the same time step. Only the first writer wins (`modifiedCount === 1`).

**Finding TOTP-010: Replay prevention via time step tracking with atomic compare-and-swap.**
- **Severity:** N/A (pass)

### 3.3 Timing Tolerance

The `otplib` default tolerance is ±1 time step (30 seconds in each direction). This accommodates clock drift between the authenticator app and the server.

**Finding TOTP-011: Default ±1 time step tolerance for clock skew.**
- **Severity:** N/A (pass)

### 3.4 Login Rate Limiting

`verify-totp.ts` (`verify-totp.ts:76-83`):
```typescript
const recentFailures = await attemptRepo.countRecentTotpFailures(userId, 15 * 60 * 1000);
if (recentFailures >= 5) {
  await userRepo.lockAccount(userId, new Date(Date.now() + 15 * 60 * 1000));
  ...
}
```

- **Window:** 15 minutes
- **Threshold:** 5 failures
- **Action:** Account lockout for 15 minutes + pending auth consumed

**Finding TOTP-012: 5 TOTP failures trigger 15-minute account lockout.**
- **Severity:** N/A (pass)
- **Rationale:** Account lockout on TOTP failure is appropriate for protecting against brute force on the 6-digit code space.

## 4. Management Operations

### 4.1 Disable TOTP

`MfaService.disableTotp()` (`mfa.service.ts:115-119`):
```typescript
async disableTotp(userId: ObjectId): Promise<void> {
  await this.mfaRepo.removeTotpSecret(userId);
  await this.userRepo.updateSecurity(userId, { totpEnabled: false, mfaEnabled: false });
}
```

`disableTotpAction` (`mfa.ts:48-63`) calls `requireSudoMode()`:
```typescript
async function disableTotpActionImpl() {
  const session = await requireSudoMode();
  ...
}
```

**Finding TOTP-013: Disabling TOTP requires sudo mode.**
- **Severity:** N/A (pass)

### 4.2 Sudo Mode

`requireSudoMode()` (`dal.ts:111-131`) enforces one of:
1. `session.lastFullAuthAt` is within the last 15 minutes (default), OR
2. A valid `cws_sudo` cookie exists (set by `verifySudoPasswordAction` after password re-entry)

The sudo cookie is HMAC-signed with the session secret and bound to the session ID.

**Finding TOTP-014: Sudo mode checks recent full authentication or valid sudo cookie.**
- **Severity:** N/A (pass)

### 4.3 MFA Preferences Update

`updateTwoFaPreferencesAction` (`mfa.ts:65-103`) also requires `requireSudoMode()`. It validates:
- Preference is one of `always`, `new_device_only`, `off`
- Default method is one of `email`, `totp`, or `null`
- TOTP cannot be set as default if not enabled

**Finding TOTP-015: MFA preference changes require sudo mode.**
- **Severity:** N/A (pass)

### 4.4 CSRF Protection

All MFA management actions are wrapped with `withCsrfGuard`:
- `generateTotpSecretAction`
- `verifyAndEnableTotpAction`
- `disableTotpAction`
- `updateTwoFaPreferencesAction`

**Finding TOTP-016: All TOTP management actions are CSRF-protected.**
- **Severity:** N/A (pass)

## 5. Secret Rotation

### 5.1 Re-enrollment

When a user re-enrolls TOTP (generates a new secret):
1. `generateTotpSecret()` creates a new secret (not saved yet)
2. `verifyAndEnableTotp()` verifies a code against the new secret
3. `saveTotpSecret()` upserts (replaces) the existing credential, resetting `lastAcceptedTimeStep` to `null`

**Finding TOTP-017: Re-enrollment replaces the old secret and resets replay state.**
- **Severity:** N/A (pass)

### 5.2 Secret Deletion

`removeTotpSecret()` deletes the `totp_credentials` document for the user. Combined with setting `totpEnabled: false` and `mfaEnabled: false` on the user document.

**Finding TOTP-018: Secret deletion is clean and complete.**
- **Severity:** N/A (pass)

## 6. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| TOTP-001 | 160-bit secret entropy from otplib | N/A | Pass |
| TOTP-002 | AES-256-GCM encryption at rest | N/A | Pass |
| TOTP-003 | Encryption key required in production | N/A | Pass |
| TOTP-004 | Plaintext fallback when key missing (dev only) | Low | Acceptable |
| TOTP-005 | QR code delivery prevents caching | N/A | Pass |
| TOTP-006 | Enrollment requires active session | N/A | Pass |
| TOTP-007 | TOTP not enabled before code verification | N/A | Pass |
| TOTP-008 | No cleanup for abandoned enrollments | Low | Advisory |
| TOTP-009 | RFC 6238 compliant via otplib | N/A | Pass |
| TOTP-010 | Replay prevention via atomic time step tracking | N/A | Pass |
| TOTP-011 | Default ±1 time step tolerance | N/A | Pass |
| TOTP-012 | Account lockout after 5 TOTP failures | N/A | Pass |
| TOTP-013 | Disable TOTP requires sudo mode | N/A | Pass |
| TOTP-014 | Sudo mode correctly checks auth freshness | N/A | Pass |
| TOTP-015 | MFA preferences require sudo mode | N/A | Pass |
| TOTP-016 | All TOTP actions CSRF-protected | N/A | Pass |
| TOTP-017 | Re-enrollment replaces secret and resets replay state | N/A | Pass |
| TOTP-018 | Secret deletion is clean | N/A | Pass |

## 7. Recommendations

1. **[TOTP-008]** Consider adding a TTL-based cleanup for `totp_credentials` where `verifiedAt` is null and `createdAt` is older than 30 days. This cleans up abandoned enrollments.
2. **[TOTP-004]** In production, add a boot guard that prevents starting without `TOTP_ENCRYPTION_KEY` (already exists). Consider logging a warning if `totp_credentials` documents exist without the `v1:` prefix (indicating plaintext secrets from before the key was configured).
3. **Consider adding a TOTP migration flow** that allows users to re-encrypt existing plaintext secrets when `TOTP_ENCRYPTION_KEY` is first configured.
