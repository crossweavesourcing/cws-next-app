# Implementation Prompt 17 — Consolidate RBAC (enforce roles or remove dead schema)

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Auth under `src/auth/`. Authorization currently uses `src/auth/dal.ts` `requireRole(required)`:

```ts
const role = user?.role; // 'admin' | 'member' | 'viewer'
const allowed = required === 'admin' ? role === 'admin' : role === required;
```

So only `admin` is truly privileged; everything else is pass/fail on the string `role`. Meanwhile the schema declares a richer model that is **NOT enforced**:
- `src/database/schemas/users.schema.ts`: `role: enum['admin','member','viewer']` AND `roleId: ObjectId|null` referencing `roles`.
- `src/database/schemas/roles.schema.ts`, `src/database/schemas/permissions.schema.ts` exist.

The `roles`/`permissions` collections are never read by `requireRole`. This is dead schema implying protection that doesn't exist.

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS). Limited fixed users (admin/seed provisioned).

## Goal (pick ONE approach, document the choice)

**Option A (recommended for an internal fixed-user app): Simplify.** Drop the `roleId`/`roles`/`permissions` schema to avoid implying a capability model that isn't enforced. Keep `role` enum as the single source of truth.

**Option B (only if product needs fine-grained permissions): Enforce.** Make `requireRole` / a new `requirePermission` read `roleId → roles → permissions` and check against a required permission.

This prompt implements **Option A** (simplest, lowest risk, matches "limited fixed users"). If the user wants B, stop and ask.

## Implementation (Option A)

1. In `src/database/schemas/users.schema.ts`:
   - Remove `roleId` property (and its `bsonType`/description). Keep `role: enum['admin','member','viewer']`.
   - Optionally narrow `status` enum to the values actually used by the login flow (`active`, `inactive`, `disabled`, `suspended`, `deleted`) and remove unused `locked`, `pending_password_reset`, `password_expired`, `force_password_change`, `pending_invite` (or keep `force_password_change` if used — verify in `login.service.ts`/`user.repository.forcePasswordChange`). Confirm before deleting.
2. Delete `src/database/schemas/roles.schema.ts` and `src/database/schemas/permissions.schema.ts` if no code references them (grep first). If any seed/script writes them, remove those writes.
3. In `src/auth/dal.ts`, add a code comment: "Authorization is role-string based; no roles/permissions collection is used." Keep `requireRole` as-is.
4. Ensure DB init (`src/database/init.ts` or `scripts/db-init.ts`) does not create `roles`/`permissions` validators/collections (grep + remove).
5. Update any docs (e.g. `docs/mongodb_auth_schema.md`) to reflect the simplified model.

## Acceptance criteria

1. `users` schema has no `roleId`; `roles`/`permissions` schemas/collections removed or confirmed unused.
2. `requireRole` still works exactly as before (admin-gated actions unchanged).
3. No dangling references to `roleId`/`roles`/`permissions` in code or init scripts (grep clean).
4. No Redis; no behavior change for end users.

## Notes

- If during grep you find `roles`/`permissions` ARE used somewhere, STOP and report — the task assumed they are dead. Do not delete referenced collections.
- Do not expand the permission model in this task.
