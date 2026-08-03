<!-- BEGIN:nextjs-agent-rules -->
# Next.js version rule

Before changing Next.js APIs or conventions, read the relevant version-matched documentation in `node_modules/next/dist/docs/`.
<!-- END:nextjs-agent-rules -->

# CWS Next App — Agent Guide

## Project

Next.js App Router application with:

- a web-only public site in `src/app/(site)/`;
- a protected web admin dashboard in `src/app/(admin)/dashboard/`;
- secured APIs in `src/app/api/` that may serve the web dashboard and a separate mobile admin application;
- authentication in `src/auth/`;
- MongoDB persistence in `src/database/`;
- OpenAPI helpers in `src/lib/api/`.

There is no Pages Router. Route-group names are not part of public URLs.

## Application surfaces

The public marketing, product, and general page content remains web-only.

Administrative capabilities may be available through both:

- the web admin dashboard;
- a separate mobile application.

The web dashboard and mobile app are separate clients of the same server-side admin domain. For admin features shared by both clients:

- keep business rules, validation, authorization, audit behavior, services, and repositories shared;
- keep web presentation and Server Action adapters inside the web application;
- expose mobile access through secured, documented Route Handler APIs;
- keep mobile-specific bearer-token, CORS, and response behavior in the mobile API layer;
- enforce the same roles, ownership rules, and data-access restrictions for both clients;
- do not duplicate business logic between Server Actions and mobile API handlers.

For each admin change, determine whether it applies to web, mobile, or both. Do not expose public website content to the mobile app unless the task explicitly requires it.

## Core rules

- Use `pnpm` only. Do not change dependencies or `pnpm-lock.yaml` unless the task requires it.
- Keep changes limited to the requested task and preserve unrelated user changes.
- Maintain strict TypeScript. Do not bypass errors with `any`, unsafe casts, or suppression comments without a documented reason.
- Match nearby code and formatting instead of introducing new project-wide patterns.
- Never expose or log secrets, passwords, tokens, session cookies, authorization headers, MFA/reset codes, or internal database errors.
- Do not weaken existing authentication, authorization, CSRF/origin, session, token-rotation, rate-limit, audit-log, cookie, or deployment-secret controls.

## Next.js, React, and UI

- Use Server Components by default and keep `'use client'` boundaries small.
- Never import database, crypto, secret-bearing configuration, repositories, or other server-only modules into Client Components.
- Convert `ObjectId`, `Date`, and other non-serializable values before passing data to Client Components or JSON responses.
- Preserve the existing `(site)` and `(admin)` route-group structure.
- Review `src/proxy.ts` and the installed CSP documentation before adding inline scripts, inline styles, or third-party resources to protected routes.
- Before creating new UI, inspect comparable existing pages and components on the same application surface. Reuse the established theme colors, typography, spacing, component patterns, icon style, interactions, and responsive behavior so new UI remains visually consistent.
- Prefer existing design tokens, Tailwind classes, shared components, and CSS variables. Do not introduce new colors, fonts, component libraries, or competing visual patterns unless the task explicitly requires a reviewed design change.
- Preserve accessibility when changing UI.

## Authentication, APIs, and data

Every Route Handler and Server Action must:

1. validate untrusted input;
2. authenticate and authorize on the server;
3. enforce ownership or role checks on the server;
4. preserve CSRF/origin protection where cookie authentication is used;
5. return safe public errors without leaking internal details.

Use the existing architecture:

- `requireActiveSession()` for protected dashboard access;
- `requireRole('admin')` for admin-only work;
- secure cookie-backed sessions for web authentication;
- existing bearer/refresh-token helpers for mobile authentication;
- the singleton MongoDB client and existing typed collections, repositories, and services;
- existing password, token, cookie, validation, and cryptography helpers.

Different authentication transports must not create different authorization rules. `src/proxy.ts` is not a replacement for server-side authorization.

Database schema or index changes require explicit task scope, compatibility review, and focused tests.

## OpenAPI

For every new or changed API endpoint:

- keep runtime validation and OpenAPI schemas synchronized;
- update the colocated `openapi.ts`;
- add new paths to `src/lib/api/assemble.ts`;
- provide accurate operation IDs, responses, tags, and security declarations;
- regenerate `.openapi/openapi.json` instead of editing it manually;
- run the applicable documentation and contract checks.

All endpoints intended for the mobile app must be documented in OpenAPI.

## Environment and generated files

- Keep real secrets only in local environment configuration.
- Never expose server secrets through `NEXT_PUBLIC_*`, browser code, responses, logs, tests, or documentation.
- Update `.env.example` only when a task adds or changes an environment variable, using non-secret placeholders.
- Do not manually edit generated build, test-report, TypeScript, lockfile, or OpenAPI output.

## Validation

Add or update focused tests when behavior changes, especially for authentication, authorization, validation, cookies, tokens, repositories, shared admin services, and API contracts.

Run only the applicable commands:

```bash
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm docs:check
pnpm test:api-contract
pnpm build
```

Report commands exactly as passed, failed, or blocked. Never claim an unexecuted command passed.

## Completion

Before finishing:

1. review `git diff` for unrelated or generated changes;
2. confirm web and mobile admin behavior uses consistent authorization and shared business rules;
3. confirm security and authorization were not weakened;
4. summarize changed files, commands run, blockers, and remaining risks.

5. Inspect the current implementation before changing anything.
6. Do not replace existing business behavior unnecessarily.
7. Create a branch or checkpoint before implementation.
8. Never invent company, product, certification, pricing, rating, review, address, phone, analytics, or legal information.
9. Use placeholders or mark blocked tasks when real business information is unavailable.
10. Update a central implementation tracker after every stage.