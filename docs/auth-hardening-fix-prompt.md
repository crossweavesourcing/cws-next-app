# CWS Authentication — Hardening Fix Prompts

> **Purpose:** A set of self-contained, copy-pasteable fixing prompts. Each section can be
> handed to an engineer/agent **individually** and executed without prior context.
>
> **Scope rules for this pass:**
> - ✅ Incremental fixes only. Do **NOT** rewrite the auth system.
> - ✅ Reuse existing helpers (`getClientIp`, `assertSameOrigin`, `verifySessionSignature`,
>   `signSessionId`, `getAuthSession`, `requireActiveSession`, `LoginAttemptRepository`).
> - ✅ For any new throttling, use the **existing MongoDB `LoginAttemptRepository`** —
>   **no Redis** (Redis rate-limiting infra is deferred).
> - ⛔ **RBAC / role enforcement is DEFERRED** — do NOT add `requireRole`/`requirePermission`
>   checks in this pass (see "Deferred" section).
> - ⛔ Do not introduce a secrets manager, SIEM, or server-issued device tokens in this pass
>   (those are later features). Keep DB schema changes minimal.
> - Preserve audit logging on every security event. Keep cookies `HttpOnly` + `SameSite=lax`
>   (+ `Secure` in production via `process.env.NODE_ENV === 'production'`).

---

## Global Context (shared by every prompt below)

**Stack:** Next.js 16 App Router, TypeScript, MongoDB driver (no Mongoose), React 19 Server Actions.

**Route protection model (Next 16):** `src/proxy.ts` is the renamed "middleware" (called `proxy.ts` in Next 16). It does an **optimistic** session-cookie signature check and redirects unauthenticated `/dashboard/*` requests to login. **Full validation (DB lookup, account status) is deferred to the page/server-action layer** via `src/auth/dal.ts` (`getAuthSession`, `requireAuth`, `requireActiveSession`).

**Auth layering:**
- `src/auth/crypto/` — `password.ts` (argon2id + optional pepper `ARGON2_SECRET`), `token.ts` (CSPRG tokens, `hashToken` SHA-256, HMAC `signSessionId`/`verifySessionSignature`).
- `src/auth/config/env.ts` — Zod-validated env (`getEnv()`).
- `src/auth/lib/` — `cookies.ts` (cookie names + setters), `device.ts` (`cws_device` client UUID), `request.ts` (`getClientIp`, `assertSameOrigin`).
- `src/auth/services/` — `login`, `session`, `oauth`, `password`, `twoFactor`, `device`, `rateLimit`, `logout`.
- `src/auth/repositories/` — Mongo data access. `loginAttempt`, `session`, `refreshToken`, `device`, `verificationToken`, `user`, `auditLog`, `oauthAccount`, `passwordPolicy`, `passwordHistory`.
- `src/auth/actions/` — Server Actions: `login`, `verify-2fa`, `change-password`, `password-reset`, `session`, `device`.
- `src/auth/dal.ts` — session resolution used by pages/actions.
- API routes: `src/app/api/auth/{google,google/callback,refresh,logout}/route.ts`, plus `src/app/api/{chat,contact,health}/route.ts`.

**Session/Token model:**
- `cws_session` cookie = `<sessionId>.<HMAC_SHA256(sessionId, SESSION_SECRET)>`. Validated in `SessionService.validateSession` (also enforces absolute + idle expiry and re-checks account status).
- `cws_refresh` cookie = opaque random token; **only its SHA-256 hash** is stored in `refresh_tokens`. Rotation on use; reuse detection revokes the whole session family.
- Intermediate auth states (MFA pending) use a signed `cws_2fa_pending` cookie carrying the userId.

**DB:** MongoDB Atlas. Collections: `users`, `sessions`, `refresh_tokens`, `oauth_accounts`, `devices`, `login_attempts`, `verification_tokens`, `audit_logs`, `password_policies`, `password_history`, `roles`, `permissions`, `user_emails`, `user_phones`.

---

## FIX-01 (Critical) — 2FA code verification never succeeds

**Severity:** Critical
**Category:** Broken Authentication / functional bug

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/two-factor.service.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/verification-token.repository.ts`

**Problem:**
In `TwoFactorService.sendCode`, a 16-char hex `raw` token is generated, its SHA-256 hash is stored, and `formatCode(raw)` (a 6-digit number) is emailed.
In `TwoFactorService.verify`, the submitted **6-digit code** is hashed (`hashToken(code)`) and looked up — but the stored hash is of the 16-char hex token, not the 6-digit code. The two never match, so **every 2FA attempt fails** (`redeem` returns `null` → `ok=false`).

**Required change:**
Make the stored hash correspond to the value the user submits.
1. In `verification-token.repository.ts`, extend `create(...)` to accept an optional explicit token to hash/return:
   ```ts
   async create(
     data: NewVerificationToken,
     ttlMs: number,
     byteLength = 8,
     tokenOverride?: string
   ): Promise<string> {
     const raw = tokenOverride ?? generateToken(byteLength);
     // ... store hashToken(raw) ...
     return raw;
   }
   ```
2. In `two-factor.service.ts` `sendCode`, generate the code, then persist a hash of **the code**:
   ```ts
   const raw = generateToken(8);            // 16 hex chars (entropy source)
   const code = formatCode(raw);           // 6-digit display code
   await this.tokenRepo.create(
     { userId, type: 'two_factor', payload: {} },
     CODE_TTL_MS,
     8,
     code                                     // <-- hash THIS, not raw
   );
   // email `code` as today
   ```
3. `verify` stays `redeem(hashToken(code))` — now it matches. **No change needed in `verify`.**

**Do NOT** increase entropy by lengthening `formatCode` beyond 6 digits without a UI change; keep 6 digits for UX. Keep the existing per-user 5-attempts / 15-min throttle and single-use `redeem`.

**Acceptance criteria:**
- A user with `security.mfaEnabled=true` can log in: receives code → submits it → `verify` returns `true` → session issued.
- The stored `verification_tokens.tokenHash` equals `hashToken(<the emailed 6-digit code>)`.
- Existing password-reset flow (which uses `create` with no override) is unaffected.

---

## FIX-02 (Critical) — Forced / expired password-change flow is broken (redirect loop)

**Severity:** Critical
**Category:** Broken Authentication / DoS

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/login.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/login.service.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/(admin)/dashboard/change-password/page.tsx`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/change-password.ts`

**Problem:**
When a password is older than `expirationDays`, `LoginService.loginWithPassword` sets `forcePasswordChange` and returns `{ status: 'force_change', userId }` **without issuing any session/refresh cookie**. `loginAction` then returns `{ redirect: '/dashboard/change-password' }` with no cookie. The change-password page calls `getAuthSession()` → `null` → redirects back to `/dashboard/login`. **Infinite loop; every user with an aged password is locked out.**

**Required change (mirror the existing `cws_2fa_pending` pattern):**
1. In `login.ts`, for the `force_change` branch, set a short-lived signed pending cookie and redirect:
   ```ts
   if (result.status === 'force_change') {
     const pending = signSessionId(result.userId.toString(), getEnv().SESSION_SECRET);
     cookieStore.set('cws_pw_pending', pending, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       path: '/',
       maxAge: 10 * 60, // 10 min to complete the change
     });
     return { redirect: '/dashboard/change-password' };
   }
   ```
   (Add `import { signSessionId } from '../crypto/token'` and `getEnv` if not present.)
2. In `change-password/page.tsx`, accept **either** a real session **or** a valid `cws_pw_pending` cookie:
   ```ts
   const session = await getAuthSession();
   const pending = (await cookies()).get('cws_pw_pending')?.value;
   const pendingId = pending ? verifySessionSignature(pending, getEnv().SESSION_SECRET) : null;
   if (!session && !pendingId) redirect('/dashboard/login');
   ```
3. In `change-password.ts` `changePasswordAction`, derive `userId` from the session cookie **or** the `cws_pw_pending` cookie (when no session), and clear the pending cookie on success. Use `ObjectId(pendingId)` in the `service.changePassword(...)` call.
4. On success, the action already sets `security.forcePasswordChange=false`. After that, the user should land on `/dashboard` (the client already `router.push('/dashboard')` on `state.success`).

**Acceptance criteria:**
- A user whose password is expired can sign in, get redirected to change-password, set a new password, and reach `/dashboard` — no loop.
- `cws_pw_pending` is cleared after a successful change.
- Users without an expired password follow the normal flow (unchanged).


---

## FIX-03 (Critical) — MFA & password-expiry bypassed via Google OAuth

**Severity:** Critical
**Category:** Broken Authentication / inconsistent assurance

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/oauth.service.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/auth/google/callback/route.ts`

**Problem:**
`OAuthService.handleCallback` resolves the user and calls `createSession` **directly**, skipping the `mfaEnabled` (2FA) and password-expiry (`forcePasswordChange`) checks that password login enforces. An account with MFA enabled can be fully authenticated via Google, defeating the second factor.

**Required change:**
After resolving/validating the user (and after the existing `status !== 'active'` check), gate OAuth through the same post-auth steps as password login:
1. If `user.security?.mfaEnabled` is true: set a signed `cws_2fa_pending` cookie (userId) and **redirect** to `/dashboard/verify-2fa` instead of creating a session. The existing `verify2faAction` will complete the login and issue the session.
2. Else if `user.security?.forcePasswordChange` (or password-expiry via `PasswordService.isExpired`) is true: set a signed `cws_pw_pending` cookie (userId) and redirect to `/dashboard/change-password`.
3. Otherwise proceed to `createSession` as today.

Because `google/callback/route.ts` is a `GET` redirect (not a Server Action), set the pending cookie via `cookieStore.set(...)` in the route handler and `NextResponse.redirect(...)`. Reuse the exact cookie options used in `src/auth/lib/cookies.ts` and the login action.

**Acceptance criteria:**
- OAuth login for an MFA-enabled user lands on `/dashboard/verify-2fa` and must pass 2FA before a session exists.
- OAuth login for a user with an expired password lands on `/dashboard/change-password`.
- OAuth login for a normal, active, non-MFA user is unchanged.
- Account-status (`active`) checks remain enforced.

---

## FIX-04 (Critical/High) — `/api/chat` is unauthenticated + leaks error details

**Severity:** Critical (exposure) / High (abuse)
**Category:** Broken Access Control / Information Disclosure

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/chat/route.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/contact/route.ts` (error-leak hardening only)

**Problem:**
`POST /api/chat` performs no auth and forwards arbitrary input to the LLM (and returns a simulated answer offline). Anyone on the internet can consume LLM quota, perform prompt injection, and exfiltrate the internal system prompt. It also returns `details: err.message` on 500 (internal error disclosure). `/api/contact` likewise returns raw `err.message`-style text.

**Required change:**
1. In `chat/route.ts`, import `getAuthSession` from `@/auth/dal` and at the top of `POST` do:
   ```ts
   const session = await getAuthSession();
   if (!session) {
     return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
   }
   ```
2. Remove `details: err.message` from the 500 response; log the error server-side only (`console.error`) and return a generic message.
3. (Optional, same pattern) In `contact/route.ts`, replace any raw `error.message` returned to the client with a generic string; keep details in `console.error`.
4. Keep the existing offline-simulation fallback but only after the auth check.

**Acceptance criteria:**
- Unauthenticated `POST /api/chat` returns `401` without calling the LLM.
- Authenticated users can use it as before.
- No internal error strings are returned in API responses.


---

## FIX-05 (High) — Activate Argon2 pepper + warn when missing in production

**Severity:** High
**Category:** Password storage / defense-in-depth

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/crypto/password.ts` (already reads `ARGON2_SECRET`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/config/env.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/.env` / production secrets (operational)

**Problem:**
`ARGON2_SECRET` is optional and is **not set** in the deployed `.env`. Without it, a DB leak exposes Argon2id hashes with no application-secret protection layer.

**Required change:**
1. **Code:** In `env.ts`, keep `ARGON2_SECRET` optional in the schema, but add a one-time boot check (e.g., in `getEnv()` or a small `validateSecurityConfig()` called at startup) that, **when `NODE_ENV === 'production'`**, logs a `console.warn` (or throws in strict mode) if `ARGON2_SECRET` is unset. Do not break dev.
2. **Operational:** Ensure `ARGON2_SECRET` (≥16 chars) is set in all production/preview environments via the secret store. (Rotating an existing pepper requires re-hashing all passwords — out of scope; just enable it going forward.)

**Acceptance criteria:**
- Production boots with a visible warning if the pepper is missing.
- Hashing/verification still works with and without the pepper (backward compatible).

---

## FIX-06 (High) — Live secrets present in working-tree `.env`

**Severity:** High
**Category:** Secret management

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/.env` (operational — rotate)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/.husky/pre-commit` (add secret scan)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/package.json` (optional husky wiring already present)

**Problem:**
`.env` currently contains a **live MongoDB Atlas connection string with embedded credentials** and a real `SESSION_SECRET`. If ever committed, pushed, or bundled, those leak.

**Required change:**
1. **Operational (do now):** Rotate the Atlas DB password and generate a new `SESSION_SECRET`. Move real secrets to the platform secret manager / CI secret store; never keep live secrets in repo-local `.env` (`.env` is already gitignored, but treat it as non-authoritative for prod).
2. **Code/tooling:** Add a Husky `pre-commit` secret scan. Minimal example using a regex grep (or add `gitleaks`/`trufflehog` as a devDependency):
   ```sh
   # .husky/pre-commit
   if git diff --cached --name-only | grep -E '\.env(\..+)?$' ; then
     echo "⚠️  Refusing to commit .env files. Use the secret manager instead."
     exit 1
   fi
   # basic secret pattern scan
   git diff --cached --diff-filter=ACM -U0 | grep -Ei '(mongodb(\+srv)?://[^:]+:[^@]+@|aws_|secret|password\s*=\s*["'\''][^"'\'']{8,}|ghp_|app.password)' && {
     echo "⚠️  Possible secret detected in staged changes."; exit 1; }
   ```
3. Keep `.env*` in `.gitignore` (already present).

**Acceptance criteria:**
- No live Atlas password or `SESSION_SECRET` remains in any committed file.
- Committing an `.env` file (or an obvious secret pattern) is blocked by pre-commit.


---

## FIX-07 (High) — Add rate limiting to password-reset requests

**Severity:** High
**Category:** Abuse / email bombing

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/password.service.ts` (`requestReset`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/password-reset.ts` (`requestResetAction`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/login-attempt.repository.ts`

**Problem:**
`requestReset` always returns success (good for enumeration resistance) but applies **no throttling**, so an attacker can email-bomb any address with reset links.

**Required change (use existing MongoDB repo — NO Redis):**
1. In `login-attempt.repository.ts`, add a counter that records reset *requests* (not just failures):
   ```ts
   async recordResetRequest(identifier: string, ip: string): Promise<void> { /* insertOne with identifierType:'PASSWORD_RESET_REQUEST', success:true, ipAddress:ip */ }
   async countRecentResetRequests(identifier: string, windowMs: number): Promise<number> { /* countDocuments identifier + type + createdAt>=$gt */ }
   ```
2. In `password.service.ts` `requestReset`, before creating the token, enforce a per-email (and optionally per-IP) cap, e.g. ≤ 5 requests / 15 min, throwing a generic "Too many requests, try later" that the action swallows into the same "success" response (so enumeration resistance is preserved).
3. `requestResetAction` stays "always returns `{ success: true }`".

**Acceptance criteria:**
- Requesting a reset for the same email >5 times in 15 min does not send additional emails (and the user still sees the generic success message).
- Valid resets still work.
- No Redis/document/collection schema changes beyond adding indexes as needed (add a TTL or index on `login_attempts` for the new type if helpful).

---

## FIX-08 (High) — Login timing side-channel (user enumeration)

**Severity:** High
**Category:** Timing attack / user enumeration

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/login.service.ts` (`loginWithPassword`)

**Problem:**
For an **unknown email**, the code throws before any `argon2.verify` (fast path). For a known email with a wrong password, it runs a full Argon2 verify (slow path). The differing timing enables email enumeration.

**Required change:**
When `user` is not found, still perform a **dummy** `verifyPassword` against a static precomputed/throwaway Argon2 hash (e.g., a module-level constant) so the response time approximates the known-user path. Keep the uniform `InvalidCredentialsError` message (already used). Optionally add a small randomized delay (e.g., `await new Promise(r => setTimeout(r, randomInt(0,50)))`) to further blur timing.

**Acceptance criteria:**
- Unknown-email and wrong-password responses take statistically similar time.
- Error messages remain identical (no enumeration via message).

---

## FIX-09 (Medium) — Centralize client-IP resolution

**Severity:** Medium
**Category:** Reliability of rate limiting / geo logic

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/request.ts` (`getClientIp`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/login.ts` (duplicate XFF parsing)

**Problem:**
`getClientIp()` takes the **first** `x-forwarded-for` hop. This is only safe if the edge proxy strips client-supplied XFF. The login action independently re-parses XFF with slightly different code (drift risk).

**Required change:**
1. Make `getClientIp` the single source of truth. Add an optional trusted-proxy notion: if a known proxy header (e.g., `x-vercel-proxied-for` / `x-real-ip`) is present and configured, prefer it; otherwise use the first XFF hop. Keep it simple — no Redis.
2. Replace the inline XFF parsing in `login.ts` with `getClientIp()` (import from `@/auth/lib/request`).
3. Ensure both the route handlers and server actions use the same helper.

**Acceptance criteria:**
- Exactly one IP-resolution implementation is used across login, OAuth callback, 2FA, and refresh.
- Behavior identical in dev (falls back to `127.0.0.1`).


---

## FIX-10 (Medium) — Make concurrent-session limit revocation batched/atomic

**Severity:** Medium
**Category:** Race condition / concurrency

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/session.service.ts` (`enforceConcurrentSessionLimit`)

**Problem:**
It loads active sessions, sorts in memory, and revokes overflow one-by-one with no transaction. Two near-simultaneous logins can both pass the check and temporarily exceed the cap.

**Required change:**
After computing the `overflow` list (ids to revoke), revoke them in a **single** batched operation rather than a loop:
```ts
const overflowIds = overflow.map(s => s._id);
if (overflowIds.length) {
  await this.sessionRepo.revokeManyByIds(overflowIds, 'system', 'Concurrent session limit exceeded');
  await this.refreshTokenRepo.revokeBySessions(overflowIds, 'session_revoked');
}
```
Add `revokeManyByIds` to `SessionRepository` (`updateMany({ _id: { $in: overflowIds }, revoked: false }, ...)`) and `revokeBySessions` to `RefreshTokenRepository` (`updateMany({ sessionId: { $in: ids }, revoked: false }, ...)`). (Full transactional atomicity across the read+write is a later hardening; this removes the N-query drift.)

**Acceptance criteria:**
- Concurrent logins beyond the cap (`5`) result in at most `cap` active sessions after the batch completes.
- No change to the cap value or cookie behavior.

---

## FIX-11 (Medium) — Move CSP to nonce-based (remove `unsafe-inline`)

**Severity:** Medium
**Category:** XSS hardening

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/next.config.ts`

**Problem:**
`script-src 'self' 'unsafe-inline'` neutralizes much of CSP's XSS protection. The comment acknowledges this is temporary.

**Required change:**
Switch to a per-request **nonce**. In `next.config.ts` `headers()`, generate a nonce and inject it into `Content-Security-Policy` as `'nonce-<value>'` for `script-src`/`style-src`, and expose it to the app (e.g., via a request header or `NextResponse` so components/`next/script` can use it). Remove `'unsafe-inline'`. Coordinate with any inline `<script>`/`<style>` (Tailwind/Motion generated styles) to use the nonce or move to external styles. Confirm Google OAuth/third-party script sources are finalized before tightening `connect-src`/`script-src` further.

**Acceptance criteria:**
- CSP contains `'nonce-...'` and no `'unsafe-inline'`.
- App renders and functions (no blocked required scripts/styles) in production build.
- `frame-ancestors 'none'` and other headers remain.

---

## FIX-12 (Medium) — Log a distinct event when a new OAuth provider is linked

**Severity:** Medium
**Category:** Auditability

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/oauth.service.ts` (`handleCallback`)

**Problem:**
When a Google identity is first linked to a user (`oauthRepo.link`), only a generic `auth.login.success` is logged — there is no visibility that a *new provider* was attached to the account.

**Required change:**
In `handleCallback`, detect the *first-time link* (i.e., when `oauthAccount` was null and a new link was created) and emit a dedicated audit event `auth.oauth.linked` (status SUCCESS) via `AuditLogRepository.log`, including `metadata: { provider: 'google', email: profile.email }`. Keep the existing `auth.login.success` event.

**Acceptance criteria:**
- First-time Google link produces an `auth.oauth.linked` audit entry.
- Subsequent logins with an already-linked account do not re-emit the link event.


---

## FIX-13 (Medium) — Device "block" should take effect immediately

**Severity:** Medium
**Category:** Security control effectiveness

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/device.repository.ts` (`setBlocked`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/session.service.ts` (`createSession` block check)

**Problem:**
Blocking a device only sets `devices.blocked`; the check runs at *next login*. An already-authenticated session on that device keeps working. Also, the `cws_device` cookie is a **client-generated UUID** (acknowledged untrusted) — clearing the cookie yields a new UUID and bypasses the block. (Server-issued device tokens are a *later* feature — see Deferred.)

**Required change (immediate, no new infra):**
1. When `setBlocked(true)` is called, also revoke that device's **currently active sessions + refresh family** so the block is enforced now, not only at next login. Add a repo method to revoke active sessions for `{ userId, deviceId }` (join `sessions.deviceId` → `devices._id`).
2. Document in code comments that client `cws_device` UUID is a **correlation hint, not a security boundary**; the block is best-effort until server-issued device tokens land.

**Acceptance criteria:**
- Blocking a device ends its active sessions immediately.
- Code comments clearly state the client-UUID limitation (no false sense of security).

---

## FIX-14 (Low) — Error-detail leakage cleanup + small hardening

**Severity:** Low
**Category:** Information disclosure / hygiene

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/contact/route.ts` (return generic messages)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/session.service.ts` (wire `accountSecurityVersion`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/scripts/seed-users.ts` (gate destructive delete)

**Required change:**
1. Ensure `/api/contact` returns only generic error strings to clients; keep `console.error` server-side.
2. In `SessionService.validateSession`, after re-checking `user.status`, also compare `session.accountSecurityVersion` (if stored) against `user.security.accountSecurityVersion`; if they differ, treat the session as revoked (defense-in-depth so a password change/security bump invalidates old sessions even if revocation missed). Store `accountSecurityVersion` on the session doc at creation if not already.
3. In `scripts/seed-users.ts`, guard the `deleteMany({})` on `login_attempts` so it only runs in non-production (`if (process.env.NODE_ENV !== 'production')`), preventing accidental prod data loss.

**Acceptance criteria:**
- No internal error text leaks to API clients.
- Bumping `accountSecurityVersion` invalidates previously issued sessions.
- Seed script will not wipe `login_attempts` in production.

---

## DEFERRED — Do NOT implement in this pass

These are explicitly out of scope per the brief (later features / infra):

- **RBAC / role & permission enforcement (audit item C1).** Roles/permissions schemas + seed exist, but enforcement (`requireRole`/`requirePermission` in `dal.ts` and gating of pages/actions) is a separate later workstream. Do not add role checks now.
- **Redis-based distributed rate-limiting infra (audit item, Redis).** Keep the existing MongoDB `LoginAttemptRepository` approach. Do not add Redis or a caching layer.
- **MFA enrollment / backup codes / management UI (audit M4).** Only fix the existing dead verify + OAuth parity (FIX-01, FIX-03). Do not build enable/disable UI or backup-code generation yet.
- **Server-issued, tamper-resistant device tokens (audit H1 full rework).** Only the immediate block-effect fix (FIX-13) is in scope.
- **SIEM / immutable / streamed audit logs (audit M6).** Keep the existing MongoDB audit collection; external streaming is later.
- **Security dashboard, login-history page, admin session-revocation UI, global-logout UI, geo-IP step-up (later features).** The underlying server actions (`revokeAllOtherSessionsAction`, `revokeSessionAction`) already exist with ownership checks; full admin-only gating waits for RBAC.
- **New DB collections or schema migrations** beyond the minimal additions described above (e.g., an `accountSecurityVersion` field is already in the schema).

---

## Suggested execution order

1. FIX-01 (2FA verify) — unblocks MFA functionally.
2. FIX-02 (forced-change flow) — unblocks expired-password users.
3. FIX-03 (OAuth MFA parity) — closes the MFA bypass.
4. FIX-04 (chat auth + leak) — closes open endpoint.
5. FIX-05 / FIX-06 (pepper + secrets) — operational security.
6. FIX-07 / FIX-08 (reset throttle + timing) — abuse resistance.
7. FIX-09 → FIX-13 (IP centralization, session-limit batch, CSP nonce, OAuth link audit, device block effect).
8. FIX-14 (low-priority hygiene).

