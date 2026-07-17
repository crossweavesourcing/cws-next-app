# File Inventory

This document provides a comprehensive inventory of the files within the `src/auth/` directory and their explicit purposes.

## `src/auth/dal.ts`
**Data Access Layer.** The single point of entry for Server Components and route handlers to read authentication state. Contains `getAuthSession()`, `requireAuth()`, `requireRole()`, and `requireActiveSession()`.

## `src/auth/config/`
- `env.ts`: Zod schema and runtime fail-closed validation for all security environment variables.

## `src/auth/actions/`
Next.js Server Actions. These are the direct endpoints called by the React frontend forms.
- `login.ts`: Handles the password and OAuth login form submissions.
- `change-password.ts`: Handles the password reset/change form.
- `verify-2fa.ts`: Handles Step-Up MFA code verification.
- `verify-totp.ts`: Handles Authenticator app code verification.
- `device.ts`: Handles remembering or forgetting trusted devices.
- `admin.ts`: Admin-specific actions for managing users.
- `session.ts`: Actions for logging out or terminating other sessions.

## `src/auth/services/`
The core business logic layer.
- `login.service.ts`: Orchestrates user lookup and password verification.
- `session.service.ts`: Validates sessions, handles timeouts, and evaluates step-up MFA requirements.
- `mfa.service.ts`: Implementation of TOTP (`otplib`) and WebAuthn (`@simplewebauthn/server`).
- `password.service.ts`: Argon2 hashing and password policy validation.
- `oauth.service.ts`: Google OAuth token exchange and user reconciliation.
- `rate-limit.service.ts`: Throttling logic for failed login attempts.
- `alerting.service.ts`: Dispatches security alerts for suspicious activity.

## `src/auth/repositories/`
Database interaction layer (MongoDB).
- `session.repository.ts`: CRUD for the `sessions` collection.
- `user.repository.ts`: CRUD for the `users` collection.
- `mfa.repository.ts`: CRUD for TOTP and WebAuthn credentials.
- `device.repository.ts`: Manages the history of trusted devices for a user.
- `audit-log.repository.ts`: Writes security events to the audit log.
- `login-attempt.repository.ts`: Tracks failed logins for rate limiting.

## `src/auth/crypto/`
- Contains any specialized cryptography utilities (e.g., encryption for data at rest, aside from passwords).

## `src/auth/validation/`
- Contains Zod schemas used to validate inputs passed from the client to the Server Actions.
