# Phase 1 - Discovery, Database Review, and Implementation Baseline

Status: Completed for approval

Scope: Review the existing Next.js project, existing authentication/database assets, current gaps, and the migration path for the fixed-user internal authentication system. No production auth code is implemented in this phase.

## Objectives

- Confirm the existing application structure before making changes.
- Review every existing authentication-related database model, schema validator, index definition, and type.
- Identify missing collections, indexes, relationships, constraints, audit fields, timestamps, and security fields against the requested internal fixed-user auth system.
- Confirm that no public registration or signup surface currently exists.
- Define the next implementation phase without replacing existing architecture.

## Technical Design

The current codebase already contains a MongoDB auth database foundation using the official MongoDB Node.js driver. The implemented database layer includes:

- `src/database/constants.ts` for collection names and creation order.
- `src/database/schemas/*` for MongoDB `$jsonSchema` validators.
- `src/database/indexes/*` for index definitions.
- `src/types/auth/*` for TypeScript document types.
- `src/database/init.ts` and `scripts/db-init.ts` for idempotent collection/index initialization.
- `src/database/client.ts`, `health.ts`, `maintenance.ts`, `observability.ts`, `retry.ts`, and `shutdown.ts` for runtime database infrastructure.

Next.js version is `16.2.7`. Relevant local Next.js docs reviewed before planning:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`

Important Next.js 16 findings:

- Middleware is now called `proxy.ts`.
- `proxy.ts` should be used for lightweight optimistic checks and headers, not full authorization logic.
- Route Handlers use Web `Request`/`Response` APIs and support `NextRequest` for cookies and URL parsing.
- Strong auth checks should live close to data access through a server-only DAL and must also be enforced in Route Handlers and Server Actions.

## Existing Folder Structure Reviewed

```text
src/
  app/
    api/contact/route.ts
    api/chat/route.ts
    (admin)/dashboard/login/page.tsx
    (admin)/dashboard/page.tsx
  database/
    schemas/
    indexes/
    client.ts
    collections.ts
    config.ts
    constants.ts
    health.ts
    init.ts
    maintenance.ts
    observability.ts
    retry.ts
    shutdown.ts
  types/auth/
scripts/
  db-init.ts
docs/
  mongodb_auth_schema.md
  db_implementation_plan.md
```

## Existing Models Reviewed

### `users`

Current strengths:

- Strict `$jsonSchema`.
- Thin identity record.
- Password hash object supports `argon2id` and `bcrypt`.
- Security fields include failed login attempts, lockout, MFA enabled, and last reset request time.
- Timestamps exist.

Gaps:

- No username.
- No employee ID.
- No department.
- No direct support for phone or email on the user document by design.
- Role is a string enum only, not a relationship to a roles collection.
- Status enum is too small for the requested lifecycle.
- No password expiration state.
- No forced password change state.
- No password history relationship.
- No soft-delete fields such as `deletedAt`, `deletedBy`, or `deleteReason`.
- No explicit account version or security version for token invalidation.

Required migration:

- Extend `users` with internal workforce identity fields or add an `employee_profiles` collection.
- Expand status model.
- Add password policy metadata and token/session invalidation versioning.

### `user_emails`

Current strengths:

- Email separated from identity.
- Unique email index exists.
- Primary email partial unique index exists.
- Enabled/verified flags exist.
- Timestamps exist.

Gaps:

- No normalized-domain index for optional Google domain policy checks.
- No audit fields for who added/verified/disabled an email.

Required migration:

- Add `domain` or computed normalized-domain field if domain enforcement is needed at query speed.
- Add optional admin audit metadata for manual user management.

### `user_phones`

Current strengths:

- E.164 validation.
- Unique phone index.
- Primary phone partial unique index.
- Enabled/verified flags and timestamps.

Gaps:

- No rate-limit relationship for phone/OTP requests beyond `otp_codes`.
- No audit metadata for admin changes.

Required migration:

- Add admin audit metadata only if phone management is required in the first production release.

### `oauth_accounts`

Current strengths:

- Provider and provider account ID unique index prevents duplicate provider links.
- Provider email is stored as informational.
- User relationship exists.

Gaps:

- Allows `linkedin`, but the requested auth scope only requires Google OAuth.
- Does not store `email_verified`, OIDC nonce/state replay metadata, token family, or provider refresh-token metadata.
- No explicit unique guard for one Google account per internal user.

Required migration:

- Keep provider extensibility, but first implementation should only enable Google.
- Store Google verification/link metadata required by the OAuth callback service.

### `devices`

Current strengths:

- Permanent device identity exists.
- Trusted/blocked device model exists.
- Device fingerprint stores hashed entropy only.
- User/device indexes exist for management and enforcement.

Gaps:

- `deviceId` unique globally may block shared-browser edge cases where the same client-generated ID is accidentally reused across users.
- No explicit max-device policy collection.
- No remembered-device limit tracking.

Required migration:

- Decide whether `deviceId` remains globally unique or becomes compound unique by `userId + deviceId`.
- Enforce limits in services and configuration.

### `sessions`

Current strengths:

- Device/session relationship exists.
- Revocation fields exist.
- Expiration and last activity fields exist.
- Active session compound index exists.

Gaps:

- No idle timeout field separate from absolute expiration.
- No session binding fields such as token binding hash or CSRF binding.
- No unique session ID public identifier separate from `_id`.
- No session risk score.

Required migration:

- Add fields for idle timeout, absolute timeout, token binding, and session generation/version as part of session service implementation.

### `refresh_tokens`

Current strengths:

- SHA-256 token hash only, no plaintext token storage.
- Rotation chain fields exist.
- Reuse detection exists.
- TTL index exists.

Gaps:

- No token binding field.
- No family ID for revoking an entire refresh-token family.
- No invalid token attempt counter.

Required migration:

- Add refresh token family and binding metadata before implementing rotation services.

### `verification_tokens`

Current strengths:

- Token hash only.
- TTL index.
- Single-use fields.
- Supports password reset.

Gaps:

- Includes `invite` and `magic_link`, but the requested application must not support public onboarding or invitation registration.
- Sparse `userId + type` index does not prevent multiple active password reset tokens when `used` and `expiresAt` differ.
- No attempt counter or replay counter.

Required migration:

- Disable invite and magic-link flows for this application scope.
- Add active-token uniqueness or service-level invalidation before issuing a new reset token.

### `otp_codes`

Current strengths:

- Hashed OTP storage.
- Max attempts and consumed fields.
- TTL index.

Gaps:

- OTP is not currently required by the requested first auth methods unless MFA/recovery options are implemented.
- No separate request-rate collection.

Required migration:

- Keep collection for MFA/recovery phase, but do not expose OTP endpoints until MFA is explicitly implemented.

### `audit_logs`

Current strengths:

- Append-oriented security event log.
- User/session/request/correlation fields exist.
- 90-day TTL index exists.
- Security alerting compound index exists.

Gaps:

- TTL may conflict with longer compliance retention requirements.
- No immutability enforcement beyond application discipline.
- No actor IP/device snapshot requirement in the schema.

Required migration:

- Add archival policy before production.
- Use service-only writer functions and avoid update/delete paths except archival.

### `login_attempts`

Current strengths:

- Per-IP and per-identifier indexes.
- TTL index.
- Lock expiry field exists.
- User ID nullable for unknown identifiers.

Gaps:

- Does not model subnet, country, device, global login rate, Google login rate, password reset rate, OTP request rate, or email-sending rate as separate dimensions.
- Does not store risk score or bot-detection result.

Required migration:

- Add a generic `rate_limits` or `security_counters` collection in Phase 2/3 rather than overloading login attempts.

## Missing Collections

Required by the request and not currently present:

- `roles`
- `permissions`
- `permission_groups`
- `role_permissions`
- `user_permissions` or user-specific overrides
- `system_settings`
- `auth_config`
- `password_policies`
- `password_history`
- `security_events` if separated from `audit_logs`
- `rate_limits` or `security_counters`
- `token_blacklist` if JWT access tokens are used and need revocation before expiry
- `admin_user_seeds` or `seed_runs` for auditable manual seeding

## Missing Indexes

Required indexes to add or evaluate:

- Unique username.
- Unique employee ID.
- User status plus updated timestamp if admin user lists are needed.
- Role/permission lookup indexes.
- Password history by user and created date.
- Active reset token uniqueness by user/type/used/expiresAt.
- Rate-limit counters by key/window.
- Session/token binding lookup where applicable.

## Missing Relationships

- `users.role` is currently a string, not a role document relationship.
- No relationship from roles to permissions.
- No relationship from users to permission overrides.
- No relationship from users to password history.
- No configuration relationship for password/session/rate-limit policy.
- No explicit admin-created-by relationship for all user lifecycle mutations.

## Missing Constraints

- Username uniqueness.
- Employee ID uniqueness.
- Expanded lifecycle status constraints.
- One active password reset token per user/type.
- Password history uniqueness by user/password hash family.
- Permission slug uniqueness.
- Role slug uniqueness.
- Configuration singleton uniqueness.

## Missing Audit Fields

- `createdBy`, `updatedBy`, `disabledBy`, `deletedBy` for manually managed user records.
- `reason` fields for account suspension/disable/delete.
- Admin action correlation on role/permission changes.
- Seed run identity and execution metadata.

## Missing Security Fields

- Password expiration timestamp.
- Force-password-change flag.
- Password history count/policy linkage.
- Account security version for invalidating sessions.
- Token binding hash.
- CSRF secret or CSRF token family metadata.
- Session absolute timeout and idle timeout split.
- Refresh token family ID.
- Risk score and risk reasons on attempts/sessions.
- Last successful login metadata on user or user security profile.

## Files To Create In Later Phases

Likely Phase 2 files:

```text
src/auth/
  config/
  crypto/
  errors/
  logging/
  validation/
  repositories/
  services/
  policies/
  dto/
src/app/api/health/route.ts
src/app/api/readiness/route.ts
src/app/api/liveness/route.ts
src/database/schemas/roles.schema.ts
src/database/schemas/permissions.schema.ts
src/database/schemas/system-settings.schema.ts
src/database/schemas/password-policies.schema.ts
src/database/schemas/password-history.schema.ts
src/database/indexes/*.indexes.ts
scripts/seed-users.ts
src/proxy.ts
```

## Database Changes

No database changes were made in Phase 1.

Planned migration style:

- Do not drop existing collections.
- Use additive schema migrations where possible.
- Use `collMod` to update validators.
- Add new indexes idempotently.
- Backfill fields with safe defaults.
- Keep migration scripts rerunnable.
- Verify unique indexes against existing data before creation.

## API Routes

Existing API routes:

- `POST /api/contact`
- `POST /api/chat`

No auth API routes currently exist.

Routes to create in future phases:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/complete`
- `GET /api/auth/devices`
- `PATCH /api/auth/devices/[id]`
- `DELETE /api/auth/devices/[id]`
- `POST /api/auth/logout-all`
- `GET /api/health`
- `GET /api/readiness`
- `GET /api/liveness`

There must be no register, signup, public invite acceptance, or public onboarding route.

## Validation Rules

Phase 1 validation findings:

- Existing schema validation is strict at the database level.
- Existing contact route uses basic manual validation.
- No central auth validation library exists.
- No environment validation exists for auth secrets because auth secrets do not yet exist.

Future validation requirements:

- Validate all JSON bodies, form data, query params, path params, cookies, and headers.
- Normalize email before lookup and insert.
- Normalize username and employee ID before insert.
- Validate all ObjectId strings before database use.
- Reject unknown fields in auth payloads.
- Validate OAuth state, nonce, PKCE verifier, redirect URI, issuer, audience, expiry, and verified email.

## Security Requirements

Phase 1 security findings:

- No public registration API or signup page found.
- Login page is UI-only and currently links directly to `/dashboard`.
- No real password verification, session creation, refresh rotation, CSRF, OAuth, or route protection exists yet.
- No global security headers or `src/proxy.ts` currently exist.
- `.env` lacks database and auth secret configuration.
- `.env.example` is missing.

Future requirements:

- Use Argon2id for password hashing.
- Use secure random token generation.
- Store only hashed tokens.
- Use HTTPOnly, Secure, SameSite cookies.
- Enforce CSRF/origin/referrer checks on state-changing auth routes.
- Add CSP/HSTS/COOP/COEP/CORP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy.
- Use database-backed sessions plus refresh rotation.
- Enforce fixed-user-only login.
- Lock accounts and throttle requests by several dimensions.
- Log every sensitive auth event.

## Error Handling

Current state:

- Database config errors are structured.
- Contact route returns user-safe errors.
- Auth-specific standardized errors do not yet exist.

Future requirements:

- Create auth error codes and safe response DTOs.
- Never expose stack traces, schema details, secrets, token values, or provider raw errors.
- Log detailed internal error metadata only server-side.
- Use request IDs and correlation IDs.

## Edge Cases

Must be handled in later phases:

- Duplicate username/email/employee ID.
- Existing deleted/disabled/suspended users.
- Expired password and force password change.
- Expired session and idle timeout.
- Refresh token reuse.
- Double-click login submission.
- Multiple tabs refreshing the same session.
- Database unavailable.
- Google unavailable.
- Invalid OAuth callback, nonce, state, or PKCE verifier.
- Reset token replay.
- Concurrent reset requests.
- Seeder rerun.
- Bootstrap rerun.
- Index creation conflict due to existing duplicate data.

## Testing Strategy

Phase 1 verification run:

- `pnpm exec eslint .` completed with 0 errors and 27 warnings.
- `pnpm exec tsc --noEmit` failed because stale generated `.next` validator files reference routes that no longer exist at `src/app/page.tsx` and `src/app/products/*`.

Future tests:

- Unit tests for validators, crypto, password policy, token hashing, and auth errors.
- Repository tests against MongoDB test database.
- Integration tests for login, refresh, logout, reset, Google OAuth callback, and device revocation.
- Rate-limit tests by IP, user, email, device, and route.
- Seeder and bootstrap idempotency tests.
- Security header tests.
- Negative tests for registration/signup routes to ensure they do not exist.

## Rollback Plan

Phase 1 rollback:

- Remove this document only.
- No runtime behavior or database state was changed.

Future migration rollback:

- Additive collections can be left unused while application code rolls back.
- New indexes can be dropped by name if they cause performance or uniqueness issues.
- Validator changes should be reversible with `collMod`.
- Data backfills must write audit logs and preserve pre-migration values where practical.

## Completion Checklist

- [x] Existing project structure reviewed.
- [x] Local Next.js 16 docs reviewed before implementation planning.
- [x] Existing database layer reviewed.
- [x] Every current auth-related collection schema reviewed.
- [x] Existing index coverage reviewed.
- [x] Existing auth UI reviewed.
- [x] Existing API routes reviewed.
- [x] Public register/signup route search completed.
- [x] Missing collections identified.
- [x] Missing indexes identified.
- [x] Missing relationships identified.
- [x] Missing constraints identified.
- [x] Missing audit/security fields identified.
- [x] Verification commands run.
- [x] No auth implementation changes made before approval.

## Recommended Phase 2

Phase 2 should implement the authentication foundation and database extensions only:

- Add `.env.example`.
- Add auth environment validation.
- Extend database constants, schemas, indexes, and types for roles, permissions, system settings, password policies, password history, and fixed-user identity fields.
- Add idempotent bootstrap checks for required configuration and default admin role/permissions.
- Add seed user script design and implementation using Argon2id.
- Add tests or script-level checks for idempotency.

Phase 2 should still not expose public registration, signup, invitation registration, or public onboarding.
