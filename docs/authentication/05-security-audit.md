# Security Audit and Protections

This document provides an overview of the specific security mitigations and defense-in-depth strategies implemented in the authentication system.

## 1. Environment Variable Fail-Closed Guards
The application validates all security-critical environment variables at boot via `src/auth/config/env.ts`.
In production, if any of the following conditions are met, the application **refuses to boot** (fails closed) rather than running in an insecure state:
- `SESSION_SECRET` is missing, too short (<32 chars), or matches a known default.
- `ARGON2_SECRET` (the password pepper) is missing or too short (<16 chars).
- `SECURE_COOKIES` is not explicitly set to `true`.
- `TRUSTED_PROXY_IP_HEADER` is missing (preventing correct IP resolution for rate limiting).

## 2. Password Security (Argon2 Peppering)
We use `argon2` for password hashing, which is currently the industry standard for memory-hard key derivation.
In addition to the standard salt, the system uses a **Server-Side Pepper** (`ARGON2_SECRET`). 
- **The Attack Vector:** If an attacker gains full read access to the MongoDB database, they steal the password hashes.
- **The Mitigation:** Because the hashes were generated using the pepper (which is stored in the environment variables/secret manager, NOT the database), the stolen hashes cannot be cracked via dictionary or brute-force attacks.

## 3. Session Forgery Protection
The `SESSION_SECRET` is used to cryptographically sign the `cws_session` cookie. If an attacker attempts to modify their session ID, the signature verification will fail, and the session will be immediately discarded.

## 4. Step-Up MFA
The application includes a strict Step-Up MFA policy (enabled by default in production).
Even if an attacker compromises a user's password, if they log in from a **new device (unrecognized IP or User-Agent)** or a **new geographical location** (resolved via the `GEOIP_LOOKUP_URL`), the session is placed in a `Pending` state. The attacker cannot access the system until they verify a 2FA code sent to the user's email or generated via TOTP.

## 5. Rate Limiting
To prevent brute-force attacks against the login endpoints, the system implements rate limiting. The `TRUSTED_PROXY_IP_HEADER` is strictly enforced to ensure the rate limiter correctly identifies the source IP address through the Vercel/Netlify edge network. If this header is misconfigured, all traffic would share a single rate-limit bucket, resulting in a self-inflicted Denial of Service (DoS) rather than a security breach (fail-safe).

## 6. Audit Logging
Every critical authentication event (login success, login failure, password change, step-up challenge) is recorded by the `AuditLogRepository` to ensure administrators have a clear cryptographic trail of access.
