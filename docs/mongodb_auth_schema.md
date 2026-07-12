# Production-Grade MongoDB Auth & Authorization Schema
**Version: Final — 11 Collections**

> **Scope**: Database design only — no business logic, API routes, JWT/OAuth implementation, services, middleware, or UI.
> **Driver**: Official MongoDB Node.js Driver (no Mongoose / ODM)
> **Validation**: MongoDB built-in `$jsonSchema` (strict / error)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Relationship Model](#relationship-model)
3. [Collection: `users`](#1-collection-users)
4. [Collection: `user_emails`](#2-collection-user_emails)
5. [Collection: `user_phones`](#3-collection-user_phones)
6. [Collection: `oauth_accounts`](#4-collection-oauth_accounts)
7. [Collection: `devices`](#5-collection-devices)
8. [Collection: `sessions`](#6-collection-sessions)
9. [Collection: `refresh_tokens`](#7-collection-refresh_tokens)
10. [Collection: `verification_tokens`](#8-collection-verification_tokens)
11. [Collection: `otp_codes`](#9-collection-otp_codes)
12. [Collection: `audit_logs`](#10-collection-audit_logs)
13. [Collection: `login_attempts`](#11-collection-login_attempts)
14. [Index Reference](#index-reference)
15. [Design Rationale](#design-rationale)

---

## Architecture Overview

```
users  (identity only)
  ├── user_emails          (contact — email)
  ├── user_phones          (contact — phone E.164)
  ├── oauth_accounts       (external providers)
  ├── devices              (permanent device identity)
  │     └── sessions       (one per authenticated device session)
  │           └── refresh_tokens (immutable rotation chain)
  ├── verification_tokens  (email/password/invite flows)
  ├── otp_codes            (WhatsApp / phone OTP)
  ├── audit_logs           (security events)
  └── login_attempts       (rate-limit / threat intelligence)
```

> [!IMPORTANT]
> Identity is strictly separated from contact information. `users` never stores `email`, `phone`, `emailVerified`, or `phoneVerified`. Sessions are ephemeral. Devices are permanent. A device can have many sessions over its lifetime.

---

## Relationship Model

```
users (1)
  ├── (N) user_emails          — userId → users._id
  ├── (N) user_phones          — userId → users._id
  ├── (N) oauth_accounts       — userId → users._id
  ├── (N) devices              — userId → users._id
  │         └── (N) sessions   — deviceId → devices._id (nullable)
  │                   └── (N) refresh_tokens — sessionId → sessions._id
  │                                             userId    → users._id
  ├── (N) verification_tokens  — userId → users._id  (nullable for invite)
  ├── (N) otp_codes            — userId → users._id  (nullable pre-link)
  ├── (N) audit_logs           — userId → users._id  (nullable for anon)
  └── (N) login_attempts       — userId → users._id  (nullable pre-link)
```

**Key relationship rules:**
- `refresh_tokens` must never exist without a parent `sessions` document.
- `sessions.deviceId` is nullable for backward compatibility. New sessions always reference a device.
- Device blocking cascades to session revocation (application-enforced).
- `userId` is nullable in `verification_tokens`, `otp_codes`, `audit_logs`, and `login_attempts`.

---

## 1. Collection: `users`

### Purpose
Stores the canonical user identity record. Deliberately thin — no contact data, no email, no phone. Acts as the root anchor for all other collections.

### Design Rationale
- **`avatar` object** (not flat `avatarUrl`): Tracks the source (`upload` / `google` / `linkedin` / `gravatar`), the original provider URL (which may expire), and an `updatedAt` timestamp — enabling lazy sync and staleness detection.
- **`password` nullable**: OAuth-only and WhatsApp-only users have no password.
- **`password.algorithm`**: Enables zero-downtime migration from bcrypt to argon2id on next successful login.

### `$jsonSchema` Validator

```js
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "users",
      required: [
        "_id",
        "profile",
        "role",
        "status",
        "loginMethods",
        "security",
        "metadata",
        "createdAt",
        "updatedAt"
      ],
      additionalProperties: false,
      properties: {
        _id: {
          bsonType: "objectId",
          description: "Primary key — MongoDB ObjectId"
        },

        // ── Profile ────────────────────────────────────────────
        profile: {
          bsonType: "object",
          required: ["displayName"],
          additionalProperties: false,
          properties: {
            displayName: {
              bsonType: "string",
              minLength: 1,
              maxLength: 120,
              description: "Public display name"
            },
            firstName: {
              bsonType: ["string", "null"],
              maxLength: 80
            },
            lastName: {
              bsonType: ["string", "null"],
              maxLength: 80
            },

            // ── Avatar ──────────────────────────────────────────
            // Structured object — not a plain URL.
            // Supports multiple sources and lazy provider sync.
            avatar: {
              bsonType: ["object", "null"],
              additionalProperties: false,
              properties: {
                url: {
                  bsonType: ["string", "null"],
                  maxLength: 2048,
                  description: "Final serving URL — CDN or provider URL"
                },
                source: {
                  bsonType: ["string", "null"],
                  enum: ["upload", "google", "linkedin", "gravatar", null],
                  description: "Where the avatar came from"
                },
                originalUrl: {
                  bsonType: ["string", "null"],
                  maxLength: 2048,
                  description: "Raw provider URL — may expire for OAuth sources"
                },
                updatedAt: {
                  bsonType: ["date", "null"],
                  description: "Last time avatar was refreshed — used for staleness detection"
                }
              }
            },

            timezone: {
              bsonType: ["string", "null"],
              maxLength: 64,
              description: "IANA timezone string, e.g. Asia/Dhaka"
            },
            locale: {
              bsonType: ["string", "null"],
              maxLength: 20,
              description: "BCP 47 locale tag, e.g. en-US"
            }
          }
        },

        // ── Password ───────────────────────────────────────────
        // Nullable — absent for OAuth-only / WhatsApp-only users.
        password: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          required: ["hash", "algorithm"],
          properties: {
            hash: {
              bsonType: "string",
              description: "Argon2id / bcrypt hash — NEVER plaintext"
            },
            algorithm: {
              bsonType: "string",
              enum: ["argon2id", "bcrypt"],
              description: "Hashing algorithm — enables zero-downtime migration"
            }
          }
        },

        // ── Password audit ─────────────────────────────────────
        passwordChangedAt: {
          bsonType: ["date", "null"],
          description: "Timestamp of last password change — used to invalidate older sessions"
        },

        // ── Role ───────────────────────────────────────────────
        role: {
          bsonType: "string",
          enum: ["admin", "member", "viewer"],
          description: "Application-level role"
        },

        // ── Status ─────────────────────────────────────────────
        status: {
          bsonType: "string",
          enum: ["active", "suspended", "deactivated", "pending_invite"],
          description: "Account lifecycle status"
        },

        // ── Login Methods ──────────────────────────────────────
        loginMethods: {
          bsonType: "array",
          minItems: 0,
          uniqueItems: true,
          items: {
            bsonType: "string",
            enum: ["password", "google", "linkedin", "whatsapp"]
          },
          description: "Derived capability flags — authoritative state lives in dedicated collections"
        },

        // ── Security ───────────────────────────────────────────
        security: {
          bsonType: "object",
          required: ["failedLoginAttempts", "lockedUntil", "mfaEnabled"],
          additionalProperties: false,
          properties: {
            failedLoginAttempts: {
              bsonType: "int",
              minimum: 0
            },
            lockedUntil: {
              bsonType: ["date", "null"],
              description: "Account locked until this timestamp; null = not locked"
            },
            mfaEnabled: {
              bsonType: "bool"
            },
            lastPasswordResetRequestAt: {
              bsonType: ["date", "null"]
            }
          }
        },

        // ── Metadata ───────────────────────────────────────────
        metadata: {
          bsonType: "object",
          additionalProperties: false,
          properties: {
            invitedBy: {
              bsonType: ["objectId", "null"],
              description: "userId of the admin who created this account"
            },
            invitedAt:  { bsonType: ["date", "null"] },
            notes: {
              bsonType: ["string", "null"],
              maxLength: 1000,
              description: "Internal admin notes"
            }
          }
        },

        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes
```js
// No additional indexes at 10–50 user scale.
// Do NOT index role or status — low cardinality.
```

---

## 2. Collection: `user_emails`

### Purpose
Normalizes email addresses away from the user identity record. Supports multiple emails per user, primary designation, and soft-disable.

### `$jsonSchema` Validator

```js
db.createCollection("user_emails", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "user_emails",
      required: ["_id","userId","email","verified","primary","enabled","createdAt","updatedAt"],
      additionalProperties: false,
      properties: {
        _id:      { bsonType: "objectId" },
        userId:   { bsonType: "objectId", description: "References users._id" },
        email: {
          bsonType: "string",
          minLength: 5,
          maxLength: 254,
          pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
          description: "Lowercase-normalized email address"
        },
        verified:   { bsonType: "bool" },
        verifiedAt: { bsonType: ["date", "null"] },
        primary: {
          bsonType: "bool",
          description: "Designates the main contact email for this user"
        },
        enabled: {
          bsonType: "bool",
          description: "Soft-disable: false = cannot be used to log in"
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.user_emails.createIndex({ email: 1 },
  { unique: true, name: "uidx_email",
    comment: "Global uniqueness; primary login lookup key" });

db.user_emails.createIndex({ userId: 1 },
  { name: "idx_userId", comment: "List all emails for a user" });

db.user_emails.createIndex({ userId: 1, primary: 1 },
  { unique: true, partialFilterExpression: { primary: true },
    name: "uidx_userId_primary",
    comment: "One primary email per user at the DB layer" });
```

> [!WARNING]
> Normalize email to lowercase **before insert/update**. MongoDB comparisons are case-sensitive.

---

## 3. Collection: `user_phones`

### Purpose
Stores E.164-normalized phone numbers. Only the E.164 format is ever stored.

### `$jsonSchema` Validator

```js
db.createCollection("user_phones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "user_phones",
      required: ["_id","userId","e164","verified","primary","enabled","createdAt","updatedAt"],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "References users._id" },
        e164: {
          bsonType: "string",
          pattern: "^\\+[1-9]\\d{6,14}$",
          description: "E.164 format — the ONLY phone number format stored"
        },
        verified:   { bsonType: "bool" },
        verifiedAt: { bsonType: ["date", "null"] },
        primary:    { bsonType: "bool" },
        enabled:    { bsonType: "bool" },
        createdAt:  { bsonType: "date" },
        updatedAt:  { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.user_phones.createIndex({ e164: 1 },
  { unique: true, sparse: true, name: "uidx_e164",
    comment: "Global uniqueness; sparse for future nullable support" });

db.user_phones.createIndex({ userId: 1 },
  { name: "idx_userId" });

db.user_phones.createIndex({ userId: 1, primary: 1 },
  { unique: true, partialFilterExpression: { primary: true },
    name: "uidx_userId_primary",
    comment: "One primary phone per user" });
```

---

## 4. Collection: `oauth_accounts`

### Purpose
Links external OAuth provider accounts (Google, LinkedIn) to internal user records.

### `$jsonSchema` Validator

```js
db.createCollection("oauth_accounts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "oauth_accounts",
      required: ["_id","userId","provider","providerAccountId","linkedAt"],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "References users._id" },
        provider: {
          bsonType: "string",
          enum: ["google", "linkedin"]
        },
        providerAccountId: {
          bsonType: "string",
          minLength: 1,
          maxLength: 256,
          description: "Stable unique ID from provider (OIDC sub claim)"
        },
        providerEmail: {
          bsonType: ["string", "null"],
          maxLength: 254,
          description: "Email from provider at link-time — informational only, not authoritative"
        },
        profile: {
          bsonType: ["object", "null"],
          additionalProperties: true,
          description: "Raw provider profile snapshot — structure varies by provider"
        },
        linkedAt:   { bsonType: "date" },
        lastUsedAt: { bsonType: ["date", "null"] }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.oauth_accounts.createIndex({ provider: 1, providerAccountId: 1 },
  { unique: true, name: "uidx_provider_accountId",
    comment: "Core lookup on OAuth callback; prevents double-link" });

db.oauth_accounts.createIndex({ userId: 1 },
  { name: "idx_userId",
    comment: "Fetch all connected providers for a user" });
```

---

## 5. Collection: `devices`

### Purpose
Stores the **permanent identity** of a user's devices. Sessions are ephemeral; devices are permanent. One device can have many sessions over its lifetime.

### Design Rationale
- **Device trust**: `trusted: true` + `trustedUntil > now` → skip secondary verification.
- **Device login limits**: Query `sessions WHERE deviceId = x AND revoked = false AND expiresAt > now` and enforce a cap.
- **Remote logout**: Revoke all sessions for a `deviceId` without affecting the user account.
- **Device blocking**: Set `blocked: true` → application rejects all new session creation for this device.
- **Fingerprint hashes only**: `canvasHash`, `webglHash`, `audioHash`, `fontsHash` are SHA-256 digests. No raw canvas data or font lists are stored.

### `$jsonSchema` Validator

```js
db.createCollection("devices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "devices",
      required: [
        "_id", "userId", "deviceId", "type",
        "trusted", "blocked", "loginCount",
        "lastSeenAt", "firstSeenAt", "createdAt", "updatedAt"
      ],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "References users._id — immutable" },

        deviceId: {
          bsonType: "string",
          minLength: 36,
          maxLength: 36,
          description: "Client-generated UUID v4 — stored in client secure storage, stable across sessions"
        },

        name: {
          bsonType: ["string", "null"],
          maxLength: 120,
          description: "User or admin assigned label, e.g. Work MacBook"
        },

        // ── Classification ─────────────────────────────────────
        type:            { bsonType: "string", enum: ["desktop","mobile","tablet","unknown"] },
        platform:        { bsonType: ["string", "null"], enum: ["web","mobile","desktop", null] },
        browser:         { bsonType: ["string", "null"], maxLength: 100 },
        operatingSystem: { bsonType: ["string", "null"], maxLength: 100 },
        userAgent:       { bsonType: ["string", "null"], maxLength: 512,
                           description: "Raw UA at first registration — never updated" },

        // ── Device Fingerprint ─────────────────────────────────
        // Passive signals only. Hashed entropy sources prevent PII storage.
        fingerprint: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            // Display
            screenResolution: { bsonType: ["string", "null"], maxLength: 20 },
            colorDepth:       { bsonType: ["int", "null"] },
            pixelRatio:       { bsonType: ["double", "null"] },

            // Hardware signals
            hardwareConcurrency: { bsonType: ["int", "null"],
                                   description: "Logical CPU cores (navigator.hardwareConcurrency)" },
            deviceMemory:        { bsonType: ["double", "null"],
                                   description: "RAM in GB, rounded by browser privacy limits" },
            maxTouchPoints:      { bsonType: ["int", "null"] },
            touchSupport:        { bsonType: ["bool", "null"] },

            // Locale & time
            timezone:  { bsonType: ["string", "null"], maxLength: 64 },
            language:  { bsonType: ["string", "null"], maxLength: 20 },
            languages: { bsonType: ["string", "null"], maxLength: 100,
                         description: "Comma-joined, e.g. en-US,en,fr" },

            // Browser capabilities
            cookiesEnabled: { bsonType: ["bool", "null"] },
            doNotTrack:     { bsonType: ["string", "null"], maxLength: 12 },
            platform:       { bsonType: ["string", "null"], maxLength: 100 },

            // Hashed entropy sources — SHA-256 hex digests only, never raw data
            canvasHash: { bsonType: ["string", "null"], minLength: 64, maxLength: 64,
                          description: "SHA-256 of canvas 2D rendering output" },
            webglHash:  { bsonType: ["string", "null"], minLength: 64, maxLength: 64,
                          description: "SHA-256 of WebGL renderer + vendor string" },
            audioHash:  { bsonType: ["string", "null"], minLength: 64, maxLength: 64,
                          description: "SHA-256 of AudioContext fingerprint" },
            fontsHash:  { bsonType: ["string", "null"], minLength: 64, maxLength: 64,
                          description: "SHA-256 of detected font list" },

            // Composite stability score computed at registration
            stabilityScore: { bsonType: ["double", "null"],
                              minimum: 0, maximum: 1,
                              description: "0.0–1.0. Higher = fingerprint stable across sessions" }
          }
        },

        // ── Trust ─────────────────────────────────────────────
        trusted:        { bsonType: "bool" },
        trustedAt:      { bsonType: ["date", "null"] },
        trustedUntil:   { bsonType: ["date", "null"],
                          description: "null = trust does not expire" },
        trustGrantedBy: { bsonType: ["string", "null"], enum: ["user","admin", null] },

        // ── Blocking ──────────────────────────────────────────
        blocked:       { bsonType: "bool" },
        blockedAt:     { bsonType: ["date", "null"] },
        blockedBy:     { bsonType: ["string", "null"], enum: ["user","admin", null] },
        blockedReason: { bsonType: ["string", "null"], maxLength: 500 },

        // ── Activity ──────────────────────────────────────────
        loginCount: { bsonType: "int", minimum: 0,
                      description: "Total successful logins from this device" },
        lastSeenAt: { bsonType: "date" },
        lastSeenIp: { bsonType: ["string", "null"], maxLength: 45 },
        lastSeenLocation: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            country: { bsonType: ["string", "null"], maxLength: 80 },
            region:  { bsonType: ["string", "null"], maxLength: 120 },
            city:    { bsonType: ["string", "null"], maxLength: 120 }
          }
        },

        // ── Registration (immutable after insert) ─────────────
        firstSeenAt: { bsonType: "date" },
        firstSeenIp: { bsonType: ["string", "null"], maxLength: 45 },

        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
// 1. Global uniqueness on client device UUID
db.devices.createIndex({ deviceId: 1 },
  { unique: true, name: "uidx_deviceId",
    comment: "Primary lookup on device registration; global uniqueness" });

// 2. All devices for a user — device management UI
db.devices.createIndex({ userId: 1, createdAt: -1 },
  { name: "idx_userId_createdAt",
    comment: "List registered devices for a user, newest first" });

// 3. Trusted devices — reduced-friction auth flow
db.devices.createIndex({ userId: 1, trusted: 1 },
  { partialFilterExpression: { trusted: true },
    name: "idx_userId_trusted",
    comment: "Fetch trusted devices; partial keeps the index selective" });

// 4. Blocked devices — enforce block on session creation
db.devices.createIndex({ userId: 1, blocked: 1 },
  { partialFilterExpression: { blocked: true },
    name: "idx_userId_blocked",
    comment: "Check if device is blocked before allowing a new session" });
```

---

## 6. Collection: `sessions`

### Purpose
Represents one authenticated device session. The parent record for refresh tokens.

### Design Rationale
- **`deviceId`**: Links to `devices._id`. Nullable for sessions created before device tracking was introduced.
- **`latestRefreshTokenId`**: Forward pointer for O(1) current token validation.
- **No `current` field**: "Current" is a runtime concept, not stored state.
- **No TTL index**: Sessions are cleaned up by scheduled maintenance jobs (preserving revoked sessions for audit).

### `$jsonSchema` Validator

```js
db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "sessions",
      required: [
        "_id", "userId", "loginMethod", "ipAddress",
        "refreshCount", "lastActivityAt", "expiresAt", "revoked", "createdAt"
      ],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: "objectId", description: "References users._id" },

        deviceId: {
          bsonType: ["objectId", "null"],
          description: "References devices._id; null for legacy sessions"
        },

        latestRefreshTokenId: {
          bsonType: ["objectId", "null"],
          description: "Forward pointer to last issued refresh token for this session"
        },

        loginMethod: {
          bsonType: "string",
          enum: ["password", "google", "linkedin", "whatsapp"]
        },

        // ── Device snapshot (captured at creation, never updated) ─
        device:          { bsonType: ["string", "null"], maxLength: 200 },
        platform:        { bsonType: ["string", "null"], enum: ["web","mobile","desktop", null] },
        browser:         { bsonType: ["string", "null"], maxLength: 100 },
        operatingSystem: { bsonType: ["string", "null"], maxLength: 100 },
        userAgent:       { bsonType: ["string", "null"], maxLength: 512 },
        ipAddress:       { bsonType: "string", maxLength: 45 },

        location: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            country: { bsonType: ["string", "null"], maxLength: 80 },
            city:    { bsonType: ["string", "null"], maxLength: 120 },
            region:  { bsonType: ["string", "null"], maxLength: 120 }
          }
        },

        // ── Activity ──────────────────────────────────────────
        refreshCount:   { bsonType: "int", minimum: 0 },
        lastRefreshAt:  { bsonType: ["date", "null"] },
        lastActivityAt: { bsonType: "date" },
        expiresAt:      { bsonType: "date" },

        // ── Revocation ────────────────────────────────────────
        revoked:       { bsonType: "bool" },
        revokedBy:     { bsonType: ["string", "null"], enum: ["user","admin","system", null] },
        revokedReason: { bsonType: ["string", "null"], maxLength: 500 },
        revokedAt:     { bsonType: ["date", "null"] },

        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.sessions.createIndex({ userId: 1, createdAt: -1 },
  { name: "idx_userId_createdAt",
    comment: "List sessions for a user, newest first" });

db.sessions.createIndex({ userId: 1, revoked: 1, expiresAt: 1 },
  { name: "idx_userId_active",
    comment: "Find active non-expired sessions; used for concurrent session limits" });
```

---

## 7. Collection: `refresh_tokens`

### Purpose
Immutable rotation chain of refresh tokens belonging to sessions.

### Rotation Flow (multi-document transaction required)

```
1. INSERT new refresh_token (rotationNumber = prev + 1, rotatedFrom = prevId)
2. UPDATE sessions SET latestRefreshTokenId = newId, refreshCount += 1, lastRefreshAt = now
3. UPDATE refresh_tokens SET revoked = true, replacedBy = newId,
                             revokedAt = now, revokedReason = 'rotated' WHERE _id = prevId
```

### `$jsonSchema` Validator

```js
db.createCollection("refresh_tokens", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "refresh_tokens",
      required: [
        "_id", "sessionId", "userId", "tokenHash",
        "rotationNumber", "reuseDetected", "revoked", "expiresAt", "createdAt"
      ],
      additionalProperties: false,
      properties: {
        _id:       { bsonType: "objectId" },
        sessionId: { bsonType: "objectId", description: "References sessions._id" },
        userId:    { bsonType: "objectId", description: "Denormalized for user-wide revocation" },

        // ── Immutable fields ──────────────────────────────────
        tokenHash: {
          bsonType: "string",
          minLength: 64,
          maxLength: 64,
          description: "SHA-256 hex digest — NEVER store plaintext token"
        },
        rotationNumber: { bsonType: "int", minimum: 0 },
        rotatedFrom:    { bsonType: ["objectId", "null"],
                          description: "Previous token _id; null for first token" },

        // ── Mutable revocation fields ─────────────────────────
        replacedBy:     { bsonType: ["objectId", "null"] },
        reuseDetected:  { bsonType: "bool",
                          description: "true = revoked token presented again (theft signal)" },
        revoked:        { bsonType: "bool" },
        revokedAt:      { bsonType: ["date", "null"] },
        revokedReason: {
          bsonType: ["string", "null"],
          enum: ["rotated","logout","session_revoked","reuse_detected","admin", null]
        },

        // ── Usage tracking ────────────────────────────────────
        lastUsedAt:        { bsonType: ["date", "null"] },
        lastUsedIp:        { bsonType: ["string", "null"], maxLength: 45 },
        lastUsedUserAgent: { bsonType: ["string", "null"], maxLength: 512 },

        expiresAt: { bsonType: "date", description: "TTL index target" },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.refresh_tokens.createIndex({ tokenHash: 1 },
  { unique: true, name: "uidx_tokenHash",
    comment: "Primary lookup on every token exchange; O(1)" });

db.refresh_tokens.createIndex({ sessionId: 1 },
  { name: "idx_sessionId",
    comment: "Bulk revoke all tokens for a session on logout" });

db.refresh_tokens.createIndex({ userId: 1 },
  { name: "idx_userId",
    comment: "Revoke all tokens for a user on account compromise" });

db.refresh_tokens.createIndex({ expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_expiresAt",
    comment: "Auto-delete at the expiry date (expireAfterSeconds=0)" });
```

---

## 8. Collection: `verification_tokens`

### Purpose
One-time tokens for email verification, password reset, email change, user invites, and magic-link login.

### `$jsonSchema` Validator

```js
db.createCollection("verification_tokens", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "verification_tokens",
      required: ["_id","type","tokenHash","payload","expiresAt","used","createdAt"],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: ["objectId", "null"],
                  description: "Null for invite tokens (user does not exist yet)" },
        type: {
          bsonType: "string",
          enum: ["email_verification","password_reset","email_change","invite","magic_link"]
        },
        tokenHash: { bsonType: "string", minLength: 64, maxLength: 64 },
        payload: {
          bsonType: "object",
          additionalProperties: true,
          description: "Self-contained data. Varies by type. See design rationale."
          // email_verification: { email }
          // password_reset:     { email }
          // email_change:       { fromEmail, destinationEmail }
          // invite:             { email, role, phone? }
          // magic_link:         { email, redirectUrl? }
        },
        expiresAt: { bsonType: "date" },
        used:      { bsonType: "bool" },
        usedAt:    { bsonType: ["date", "null"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.verification_tokens.createIndex({ tokenHash: 1 },
  { unique: true, name: "uidx_tokenHash" });

db.verification_tokens.createIndex({ userId: 1, type: 1 },
  { sparse: true, name: "idx_userId_type",
    comment: "Check for active token before issuing new one; sparse for null userId" });

db.verification_tokens.createIndex({ expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_expiresAt" });
```

---

## 9. Collection: `otp_codes`

### Purpose
Dedicated collection for time-limited OTP authentication codes. Separated from `verification_tokens` because OTPs require attempt counting and are phone-scoped.

### `$jsonSchema` Validator

```js
db.createCollection("otp_codes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "otp_codes",
      required: ["_id","e164","otpHash","type","attempts","maxAttempts","consumed","expiresAt","createdAt"],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: ["objectId", "null"],
                  description: "Null if user not yet resolved at OTP issuance" },
        e164: {
          bsonType: "string",
          pattern: "^\\+[1-9]\\d{6,14}$"
        },
        otpHash: { bsonType: "string", minLength: 64, maxLength: 64,
                   description: "SHA-256 hex digest — NEVER store OTP plaintext" },
        type: {
          bsonType: "string",
          enum: ["whatsapp_login", "phone_verification"]
        },
        attempts:    { bsonType: "int", minimum: 0 },
        maxAttempts: { bsonType: "int", minimum: 1, maximum: 10 },
        consumed:    { bsonType: "bool" },
        consumedAt:  { bsonType: ["date", "null"] },
        expiresAt:   { bsonType: "date" },
        createdAt:   { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.otp_codes.createIndex({ e164: 1, consumed: 1, expiresAt: 1 },
  { name: "idx_e164_active",
    comment: "Find active non-consumed non-expired OTP for a phone" });

db.otp_codes.createIndex({ expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_expiresAt" });
```

---

## 10. Collection: `audit_logs`

### Purpose
Immutable append-only log of security-relevant events with configurable retention.

### `$jsonSchema` Validator

```js
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "audit_logs",
      required: ["_id","action","status","createdAt"],
      additionalProperties: false,
      properties: {
        _id:       { bsonType: "objectId" },
        userId:    { bsonType: ["objectId", "null"] },
        sessionId: { bsonType: ["objectId", "null"] },
        action: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
          description: "Dot-namespaced event, e.g. auth.login.success"
        },
        status: { bsonType: "string", enum: ["SUCCESS","FAILURE","WARNING"] },
        errorCode: { bsonType: ["string", "null"], maxLength: 80 },
        actor: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            type: { bsonType: "string", enum: ["user","admin","system"] },
            id:   { bsonType: ["objectId", "null"] }
          }
        },
        source: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            platform:   { bsonType: ["string", "null"], enum: ["web","mobile","api", null] },
            appVersion: { bsonType: ["string", "null"], maxLength: 40 }
          }
        },
        correlationId: { bsonType: ["string", "null"], maxLength: 128 },
        requestId:     { bsonType: ["string", "null"], maxLength: 128 },
        resource: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            type: { bsonType: ["string", "null"], maxLength: 60 },
            id:   { bsonType: ["string", "null"], maxLength: 128 }
          }
        },
        metadata:  { bsonType: ["object", "null"], additionalProperties: true },
        ipAddress: { bsonType: ["string", "null"], maxLength: 45 },
        userAgent: { bsonType: ["string", "null"], maxLength: 512 },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.audit_logs.createIndex({ userId: 1, createdAt: -1 },
  { sparse: true, name: "idx_userId_createdAt",
    comment: "User audit history; sparse for null userId events" });

db.audit_logs.createIndex({ action: 1, status: 1, createdAt: -1 },
  { name: "idx_action_status_createdAt",
    comment: "Security alerting: find all FAILURE events of a type in a time window" });

// TTL — configurable via collMod. Default: 90 days.
db.audit_logs.createIndex({ createdAt: 1 },
  { expireAfterSeconds: 7776000, name: "ttl_createdAt",
    comment: "90-day default. Update via collMod. Archive first for compliance retention." });
```

---

## 11. Collection: `login_attempts`

### Purpose
Records every login attempt for rate-limiting, lockout tracking, and geographic anomaly analysis.

### Design Rationale
- **Separated from `audit_logs`**: High-volume, ephemeral (24h default), rate-limit focused.
- **`lockExpiresAt`**: When set, this attempt triggered a lockout. Application checks this field to reject requests without scanning `users.security.lockedUntil`, reducing cross-collection reads during high-volume attacks.
- **`userId` nullable**: Failed attempt against unknown identifier has no resolvable user.

### `$jsonSchema` Validator

```js
db.createCollection("login_attempts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "login_attempts",
      required: ["_id","identifierType","identifier","ipAddress","success","createdAt"],
      additionalProperties: false,
      properties: {
        _id:    { bsonType: "objectId" },
        userId: { bsonType: ["objectId", "null"] },

        identifierType: {
          bsonType: "string",
          enum: ["EMAIL","PHONE","GOOGLE","LINKEDIN","WHATSAPP"]
        },
        identifier: {
          bsonType: "string",
          minLength: 1,
          maxLength: 254,
          description: "Normalized identifier — email, E.164 phone, or OAuth subject. NEVER a password."
        },

        ipAddress: { bsonType: "string", maxLength: 45 },
        userAgent: { bsonType: ["string", "null"], maxLength: 512 },
        device:    { bsonType: ["string", "null"], maxLength: 200 },

        success:       { bsonType: "bool" },
        failureReason: { bsonType: ["string", "null"], maxLength: 200,
                         description: "e.g. invalid_password, account_locked, otp_expired" },

        // ── Lockout tracking ──────────────────────────────────
        lockExpiresAt: {
          bsonType: ["date", "null"],
          description: "When set, this attempt triggered a lockout expiring at this timestamp. Allows rate-limit decisions without reading users collection."
        },

        correlationId: { bsonType: ["string", "null"], maxLength: 128 },
        country:       { bsonType: ["string", "null"], maxLength: 80 },
        city:          { bsonType: ["string", "null"], maxLength: 120 },
        createdAt:     { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Indexes

```js
db.login_attempts.createIndex({ ipAddress: 1, createdAt: -1 },
  { name: "idx_ipAddress_createdAt",
    comment: "Rate limiting: count attempts from an IP in a window" });

db.login_attempts.createIndex({ identifier: 1, identifierType: 1, createdAt: -1 },
  { name: "idx_identifier_createdAt",
    comment: "Rate limiting: count attempts per identifier in a window" });

// TTL — default 24h. Tune via collMod.
db.login_attempts.createIndex({ createdAt: 1 },
  { expireAfterSeconds: 86400, name: "ttl_createdAt",
    comment: "24h default retention; extend for geo-anomaly analysis if needed" });
```

---

## Index Reference

| Collection | Index Name | Fields | Type | Purpose |
|---|---|---|---|---|
| `user_emails` | `uidx_email` | `email` | Unique | Login lookup by email |
| `user_emails` | `idx_userId` | `userId` | Single | List emails for a user |
| `user_emails` | `uidx_userId_primary` | `userId, primary` (partial) | Partial Unique | One primary email per user |
| `user_phones` | `uidx_e164` | `e164` | Unique Sparse | Login lookup by phone |
| `user_phones` | `idx_userId` | `userId` | Single | List phones for a user |
| `user_phones` | `uidx_userId_primary` | `userId, primary` (partial) | Partial Unique | One primary phone per user |
| `oauth_accounts` | `uidx_provider_accountId` | `provider, providerAccountId` | Compound Unique | OAuth callback lookup |
| `oauth_accounts` | `idx_userId` | `userId` | Single | List OAuth links for a user |
| `devices` | `uidx_deviceId` | `deviceId` | Unique | Device registration lookup |
| `devices` | `idx_userId_createdAt` | `userId, createdAt` | Compound | Device management UI |
| `devices` | `idx_userId_trusted` | `userId, trusted` (partial) | Partial | Trusted device lookup |
| `devices` | `idx_userId_blocked` | `userId, blocked` (partial) | Partial | Block check on login |
| `sessions` | `idx_userId_createdAt` | `userId, createdAt` | Compound | List sessions, newest first |
| `sessions` | `idx_userId_active` | `userId, revoked, expiresAt` | Compound | Active session lookup |
| `refresh_tokens` | `uidx_tokenHash` | `tokenHash` | Unique | O(1) token validation |
| `refresh_tokens` | `idx_sessionId` | `sessionId` | Single | Revoke on logout |
| `refresh_tokens` | `idx_userId` | `userId` | Single | Revoke on compromise |
| `refresh_tokens` | `ttl_expiresAt` | `expiresAt` | TTL | Auto-delete expired tokens |
| `verification_tokens` | `uidx_tokenHash` | `tokenHash` | Unique | Token validation |
| `verification_tokens` | `idx_userId_type` | `userId, type` | Compound Sparse | Dedup before issuing |
| `verification_tokens` | `ttl_expiresAt` | `expiresAt` | TTL | Auto-delete |
| `otp_codes` | `idx_e164_active` | `e164, consumed, expiresAt` | Compound | Active OTP lookup |
| `otp_codes` | `ttl_expiresAt` | `expiresAt` | TTL | Auto-delete |
| `audit_logs` | `idx_userId_createdAt` | `userId, createdAt` | Compound Sparse | User audit history |
| `audit_logs` | `idx_action_status_createdAt` | `action, status, createdAt` | Compound | Security alerting |
| `audit_logs` | `ttl_createdAt` | `createdAt` | TTL (90d) | Configurable retention |
| `login_attempts` | `idx_ipAddress_createdAt` | `ipAddress, createdAt` | Compound | IP rate limiting |
| `login_attempts` | `idx_identifier_createdAt` | `identifier, identifierType, createdAt` | Compound | Identifier rate limiting |
| `login_attempts` | `ttl_createdAt` | `createdAt` | TTL (24h) | Short retention |
| **Total** | **29 explicit** | | | + 11 implicit `_id` = **40 total** |

---

## Design Rationale

### Why No Mongoose / ODM?
Direct MongoDB driver gives full control over BSON types, write concerns, and transaction semantics. ODMs can silently swallow validation errors or override write concerns. Unacceptable for an auth system.

### Why `$jsonSchema` at the Database Layer?
Application bugs, migration scripts, and direct DB access can all bypass application-layer validation. `validationLevel: "strict"` + `validationAction: "error"` means no malformed document can enter regardless of code path.

### Why Is `devices` Separate from `sessions`?
Sessions are ephemeral credentials (hours to days). Devices are permanent identity records (lifetime of the device). Merging them would force every session query to carry device fingerprint data, bloat session documents, and make it impossible to manage device trust independently of active sessions.

### Why `avatar` Is a Structured Object
A plain `avatarUrl` string cannot answer: *where did this come from? is it stale? should we sync?* The structured object tracks `source` (enables lazy sync for OAuth avatars), `originalUrl` (the raw provider URL that may expire), and `updatedAt` (staleness signal). Zero overhead for display — `url` is still the field served to clients.

### Why `lockExpiresAt` on `login_attempts`
During a brute-force attack, the application needs to reject requests quickly. Without `lockExpiresAt` on the attempt record, every rejection requires reading `users.security.lockedUntil` — a cross-collection read under high load. Storing the lockout expiry on the attempt record allows the rate-limiter to make reject/allow decisions from the `login_attempts` collection alone, using already-indexed `identifier` + `createdAt` queries.

### Why Fingerprint Hashes Only on `devices`
Canvas, WebGL, audio, and font fingerprints can be used to identify individuals. Storing the raw data would be a GDPR/privacy liability. SHA-256 hashes retain the anomaly detection value (same device ≈ same hash) while preventing reconstruction of the original data. `stabilityScore` quantifies how reliable the fingerprint is as an identifier for this specific device.

### Why Are Sessions Separate from Refresh Tokens?
Sessions are long-lived device records. Refresh tokens are short-lived credentials. Separating them allows listing active devices without touching token history, revoking a session in O(1), and applying TTL only where appropriate (tokens, not sessions).

### Why Is `userId` Denormalized on `refresh_tokens`?
`refresh_tokens.userId` mirrors `sessions.userId`. It enables a single-collection query to revoke all tokens for a user across all sessions (account compromise response) without a join. The only intentional denormalization in the schema.

### Audit Log Growth Management
Managed in layers (apply in order):
1. **TTL index (90d, active always)** — handles the common case automatically.
2. **`archiveAuditLogs()` nightly job** — copies docs older than N days to cold collection before TTL deletes them.
3. **Reduce TTL via `collMod`** — safe after archival is confirmed.
4. **Separate `audit_logs_archive`** — cold, minimal indexes (`_id` + `createdAt` only).

### Login Attempts vs. Audit Logs
| | `login_attempts` | `audit_logs` |
|---|---|---|
| Retention | 24h configurable | 90d configurable |
| Volume | Very high | Moderate |
| Purpose | Rate limiting, lockout, geo-anomaly | Security audit, compliance |
| Scope | Login flow only | All security events |
| `userId` | Often null | Often populated |
| Archival | Not required | Required for compliance |
