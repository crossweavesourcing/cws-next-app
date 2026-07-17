# Session Management

The application uses **Database-Backed Sessions**. We intentionally do not use stateless JWTs. Database sessions guarantee that when an administrator suspends a user, or a user logs out remotely, their session is invalidated instantly—something stateless JWTs cannot easily achieve without a Redis blocklist.

## Architecture

1. **Storage**: Sessions are stored in the MongoDB `sessions` collection.
2. **Identification**: A cryptographically random session token (the session ID) is generated upon login.
3. **Transport**: The session ID is sent to the client via an HTTP-Only, Secure cookie named `cws_session`.
4. **Validation**: Every authenticated request passes the cookie value to `SessionService.validateSession()`.

## Cookie Security Flags
In production, the `cws_session` cookie is heavily locked down:
- `HttpOnly`: Prevents Cross-Site Scripting (XSS) attacks from stealing the token via `document.cookie`.
- `Secure`: Ensures the cookie is only transmitted over HTTPS. (This is strictly enforced by the `SECURE_COOKIES` environment variable guard).
- `SameSite=Lax`: Prevents Cross-Site Request Forgery (CSRF) by preventing the cookie from being sent on cross-site POST requests.

## Session Lifecycle

### Creation
When a user logs in successfully, `SessionService.createSession(userId)` writes a new document to the database with:
- The user's ID
- The current timestamp
- The device fingerprint (User Agent, IP Address) for step-up MFA and audit logging.

### Expiry and Timeouts
Sessions have two expiry mechanisms, configured via `env.ts`:
1. **Idle Timeout (`IDLE_TIMEOUT_MS`)**: Default is 30 minutes. If the user makes no requests within this window, the session becomes inactive.
2. **Absolute Timeout (`ACCESS_SESSION_TTL_MS` / `REFRESH_TOKEN_TTL_MS`)**: The hard limit on how long the session can remain alive, even with continuous activity.

### Validation
`SessionService.validateSession(sessionId)` executes the following checks:
1. Does the session exist in the database?
2. Has it exceeded its absolute expiry?
3. Has it exceeded its idle timeout?
4. Is the user's account still active (not suspended/deleted)?

If any check fails, the session is deleted from the database and the client's cookie is cleared.

### Revocation
Because sessions are in MongoDB, global revocation is trivial.
- **Log out all devices**: Delete all documents in the `sessions` collection matching the `userId`.
- **Admin suspension**: Marking a user as inactive in the `users` collection immediately causes all subsequent `validateSession` checks to fail, forcefully terminating access without waiting for a token to expire.
