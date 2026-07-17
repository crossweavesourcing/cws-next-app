# Item 6 — Monitoring + alerting on security events  (M-7)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File A: `src/database/observability.ts` (`setupDatabaseObservability` + `emitLog`, ≈ 42–138).
File B (new, thin): `src/auth/services/alerting.service.ts`.
File C: `src/auth/repositories/audit-log.repository.ts` (`log()`, best-effort).
File D: `src/database/client.ts` (where `MongoClient` is created — wire the sink next to `setupDatabaseObservability`).
Read `src/auth/services/session.service.ts` reuse/alert calls (`alertReuseDetected` ≈ 348–361) and `src/auth/services/device.service.ts` (`alertNewDevice`/`alertSuspiciousLocation` ≈ 94–132) to see current alert emission.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware.
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed; `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`.
- Audit via `AuditLogRepository.log({...})` — best-effort, retried, never throws.
- `observability.ts` already has `onSlowQuery` / `onCommandError` hooks but only `console.*`s them. No external sink.

## CURRENT BEHAVIOR (the gap)
- Security events (`auth.refresh.reuse_detected`, `auth.login.failure`, `auth.login.suspicious`, `auth.oauth.failed`, `auth.password.reset.success`) are written to Mongo but nobody watches them.
- No alerting on reuse, failure spikes, or suspicious logins → audit logs are compliance theater.

## FIX (incremental)
- Extend `setupDatabaseObservability` (or add sibling `setupSecurityAlerting`) to accept a callback/interface that forwards key AuditLog actions to an external sink.
- Make the sink pluggable: **default = structured `console.warn` JSON** (keeps current behavior) but allow `process.env.SECURITY_WEBHOOK_URL` (or a `SecurityAlertSink` interface) to POST a compact event.
- Add a thin `src/auth/services/alerting.service.ts` that the existing `alertReuseDetected` / `alertNewDevice` / `alertSuspiciousLocation` route through, so alerts are centralized + testable. Keep all calls best-effort (never block the request).
- Wire the sink in `src/database/client.ts` next to `setupDatabaseObservability`.

## ACCEPTANCE
- [ ] Security events emit to a configurable sink (webhook) when configured, else console.
- [ ] Reuse-detection and suspicious-login events are forwarded, not just stored.
- [ ] Failure spikes can be aggregated; a smoke test confirms an event reaches the sink.

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add a unit test for `alerting.service` (sink receives the event; fails-open when webhook errors). No change to session/refresh/cookie shapes. Never let alert latency block a user request.
