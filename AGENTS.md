<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CWS Next App agent guide

## Project overview

This is a private Next.js application with two main surfaces:

- a public Cross Weave Sourcing marketing and product site;
- an authenticated dashboard and a web/mobile authentication API backed by MongoDB.

The authentication and persistence code has deliberate security controls, including database-backed revocable sessions, refresh-token rotation, MFA/passkeys, role checks, CSRF and origin checks, audit logging, rate limiting, secure-cookie policy, and deployment-time secret validation. Preserve these controls unless a task explicitly asks for a reviewed security change.

## Technology stack

- Next.js 16.2.7 App Router and React 19.2.4
- TypeScript 5 in strict, no-emit mode
- Tailwind CSS 4 through `@tailwindcss/postcss`, plus global CSS
- MongoDB Node.js driver 6; no ODM or Mongoose
- Zod 4 for validation and `zod-openapi` for API schemas
- Vitest for colocated unit/smoke tests and Playwright for end-to-end tests
- ESLint 9 with Next.js core-web-vitals and TypeScript presets
- Netlify configuration and GitHub Actions CI, both using Node 22 and pnpm 10

There is no checked-in Prettier, Biome, or EditorConfig configuration. Match the nearby file's formatting; do not perform formatting-only rewrites.

## Package manager

Use pnpm. `pnpm-lock.yaml` and `pnpm-workspace.yaml` are authoritative. Do not use npm or Yarn, and do not modify dependencies or the lockfile unless the task explicitly requires it. CI and Netlify install with `pnpm install --frozen-lockfile`.

## Development commands

These are the scripts currently defined in `package.json`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the development server. |
| `pnpm build` | Run `security-scan.js`, then create a production build. |
| `pnpm start` | Serve a production build. |
| `pnpm lint` | Run ESLint. |
| `pnpm test:unit` | Run Vitest unit and smoke tests. |
| `pnpm test:e2e` | Run the Playwright suite. |
| `pnpm db:init` | Initialize MongoDB collections, validators, and indexes from `.env`; it is intended to be idempotent. |
| `pnpm db:seed` | Seed database data from `.env`. |
| `pnpm docs:generate` | Generate `.openapi/openapi.json`. |
| `pnpm docs:lint` | Lint the generated OpenAPI document. |
| `pnpm docs:coverage` | Check route-handler documentation coverage. |
| `pnpm docs:check` | Run generation, stale-artifact, lint, coverage, and contract checks. |
| `pnpm test:api-contract` | Validate the generated API contract. |
| `pnpm docs:dev` | Generate API docs and start Next.js. |
| `pnpm docs:watch` | Watch TypeScript source and regenerate API docs. |

`prepare` installs Husky hooks and is not a routine validation command. The repository has no `typecheck` package script; CI currently invokes TypeScript directly. Never claim a command passed unless it was actually executed successfully, and report environment-dependent failures honestly. In particular, builds, E2E tests, and database commands may require valid local environment variables and MongoDB state.

## Repository structure

- `src/app/`: App Router pages, layouts, Route Handlers, metadata, and global CSS.
- `src/app/(site)/`: the public route group. It owns the site layout, `/`, `/products`, and `/products/[slug]`.
- `src/app/(admin)/dashboard/`: dashboard pages and page-local client components/forms. The route-group name is not part of the URL.
- `src/app/api/`: application API Route Handlers; each handler currently has a colocated `openapi.ts`.
- `src/auth/`: auth actions, DAL guards, crypto, validation, repositories, services, and request/cookie utilities.
- `src/database/`: MongoDB connection/configuration, typed collection access, JSON schema validators, index definitions, initialization, retries, health, and lifecycle helpers.
- `src/components/`: shared site UI. Feature-local dashboard UI remains beside its page.
- `src/context/ContactForm/`: the existing client-side contact-form context.
- `src/lib/`: static product data, dashboard data, and reusable OpenAPI helpers/models.
- `src/types/auth/`: MongoDB authentication document types.
- `scripts/`: database and OpenAPI/security maintenance scripts.
- `tests/`: Playwright E2E tests. Vitest tests are colocated under `src/`.
- `docs/`: architecture, authentication, database, security-audit, and API-documentation notes.
- `public/`: static images and other public assets.

The application has no Pages Router, no root `app/` or `pages/` directory, and no `src/pages/`. It also currently has no `loading.tsx`, `error.tsx`, or `not-found.tsx` boundary. Do not invent a repository-wide boundary convention from that absence; follow the task and nearby App Router code.

## Routing conventions

- Add application routes under `src/app/`, using App Router file conventions.
- Preserve the `(site)` and `(admin)` route-group split. Confirm the public URL because route groups do not add URL segments.
- The root `src/app/layout.tsx` owns global metadata, `<html>`, `<body>`, and `globals.css`; `(site)/layout.tsx` supplies the public header.
- Dynamic route props use the Next.js 16 async form, such as `params: Promise<{ slug: string }>` followed by `await params`. Read the installed Next.js guide before adding or changing route APIs.
- The product detail route uses `generateStaticParams`, `generateMetadata`, and `notFound()` over data from `src/lib/products.ts`. Follow this pattern only for comparable static-data routes.
- Keep page-specific interactive components beside their page (for example `LoginForm.tsx` or `SessionsClient.tsx`); put genuinely shared site UI in `src/components/`.
- Use `@/*` imports for `src/*` where practical, as configured in `tsconfig.json`.

## Server and Client Components

- Components are Server Components by default. Keep pages and layouts server-rendered when they only fetch data, check access, redirect, or compose UI.
- Add `'use client'` only at the smallest interactive boundary that needs state, effects, event handlers, browser APIs, or React client hooks.
- Existing protected pages authenticate and fetch on the server, convert MongoDB values such as `ObjectId` and `Date` to serializable strings, and pass plain data to page-local Client Components. Preserve that boundary.
- Never import database, crypto, secret-bearing configuration, repositories, or other server-only modules into a Client Component.

## UI and styling

- Reuse an existing component before creating a new one. Search both `src/components/` and the relevant route directory.
- Styling is primarily Tailwind utility classes. `src/app/globals.css` imports Tailwind, declares theme fonts/colors, and contains substantial site-specific selectors; review it before adding global styles.
- Match the visual language of the surface being changed. The public/product site and dark admin dashboard have related but distinct existing patterns. Do not introduce a design system that the repository does not have.
- Use `next/image` for application imagery and `next/link` for internal navigation unless nearby code has a deliberate reason otherwise. Reuse Lucide icons where an appropriate icon already exists.
- Preserve responsive classes, visible focus treatment, semantic structure, useful alternative text, form labels, keyboard operation, and existing ARIA labels/states. New controls must be accessible without a pointer and must not rely on color alone.
- Avoid adding arbitrary inline scripts/styles on protected dashboard routes: `src/proxy.ts` applies a per-request nonce-based CSP there. Review the CSP and installed Next.js CSP guidance before adding third-party resources.

## Data fetching and mutations

- Public product pages currently read synchronous static data from `src/lib/products.ts`; dashboard Server Components access MongoDB through repositories or typed collection helpers.
- Prefer existing repositories/services for auth-domain data instead of querying collections directly. A few pages use typed collection helpers, but that is not enough to establish direct collection access as the default.
- Keep database and external-service calls on the server. Add explicit timeouts and safe failure handling to outbound calls, following comparable Route Handlers.
- Do not add caching or revalidation policy by assumption. Inspect comparable code and the installed Next.js 16 caching documentation first.

## Server Actions

- Auth Server Actions are grouped in `src/auth/actions/` and begin with `'use server'`.
- Treat every action as a public server entry point: validate `FormData`, perform authentication/authorization inside the action, and return safe state objects for expected failures.
- State-changing auth actions use the existing `withCsrfGuard` origin check. Do not remove or bypass it.
- Use DAL guards such as `requireActiveSession()` or `requireRole()` before protected work, then call services/repositories. Never trust a role, user ID, or ownership assertion supplied by the client.
- Use `revalidatePath` only when the mutation changes rendered server data, following the existing admin actions.

## API conventions

- Implement APIs as App Router Route Handlers in `src/app/api/**/route.ts`; do not add Pages Router APIs.
- Every current handler under `src/app/api/` has a colocated `openapi.ts`. For a new or changed endpoint, keep runtime validation and the OpenAPI contract aligned, add the path object to `src/lib/api/assemble.ts`, and run the documentation checks.
- Use shared schemas and constants from `src/lib/api/` where applicable. OpenAPI uses Zod 4 metadata and `zod-openapi`; each operation needs a unique `operationId`, summary, tags, responses, and accurate security declaration.
- `src/app/api-docs/route.ts` and `src/app/openapi.json/route.ts` serve documentation outside the `/api` handler tree; inspect them before changing documentation URLs.
- Mobile v1 endpoints use `mobileJson` for response/CORS headers, `mobileOptions` for preflight, `requireJson` for JSON content type, bearer authentication helpers, generic public errors, and usually `runtime = 'nodejs'`. Follow nearby mobile endpoints rather than the web-cookie API pattern.
- Web auth endpoints use cookie helpers and same-origin/CSRF checks appropriate to the operation. Preserve cookie names, paths, `httpOnly`, `secure`, and `sameSite` behavior.
- Return intentional HTTP status codes and do not leak stack traces, token state, credentials, database errors, or internal exception details. Existing response shapes vary by endpoint family, so match the neighboring family instead of imposing a new global envelope.

## Input validation

- Validate all untrusted input at the server boundary: request bodies, query/path parameters, headers where relevant, cookies/tokens, and `FormData`.
- Prefer an existing Zod schema or add a colocated schema for new structured input. Use `safeParse` when returning structured validation errors. Some older handlers use manual checks; their existence is not a convention to copy into new endpoints.
- Parsing JSON can fail. Enforce content type where the endpoint family does so and handle malformed bodies without exposing internals.
- Validation does not replace output encoding, authorization, CSRF protection, or safe database query construction.

## Authentication and authorization

- `src/auth/dal.ts` is the server-only source for web session checks. `getAuthSession()` validates the signed `cws_session` cookie against MongoDB; `requireAuth()`, `requireActiveSession()`, and `requireRole()` implement guards.
- `src/proxy.ts` is an optimistic dashboard gate and CSP layer, not full authorization. Full session validation and database-backed authorization must still occur in protected Server Components, Server Actions, and Route Handlers.
- Call `requireActiveSession()` for normal protected dashboard access so forced-password-change state is respected. Call `requireRole('admin')` for admin operations. Current RBAC treats `admin` as the privileged role and otherwise requires an exact role match.
- Mobile APIs authenticate bearer tokens with helpers in `src/auth/lib/mobile.ts`; endpoints that accept either cookie or bearer auth use the existing combined helper.
- Enforce object ownership and role checks on the server after authentication. Hiding UI or checking a client-provided role is not authorization.
- Do not weaken MFA, password policy, session/idle expiry, token rotation/reuse detection, device checks, lockout/rate limiting, audit logging, OAuth/PKCE, origin checks, or secure-cookie settings.

## Database and persistence

- Use the official MongoDB driver through the singleton in `src/database/client.ts`. Do not create independent `MongoClient` instances.
- Use typed collection accessors from `src/database/collections.ts` and domain repositories from `src/auth/repositories/`. Put orchestration/business rules in services rather than Route Handlers or UI components.
- Reuse names from `src/database/constants.ts`. Keep TypeScript document types, MongoDB JSON schema validators, index definitions, repositories, and API models consistent when a task explicitly changes persisted data.
- Database initialization and index creation live in `src/database/init.ts` and `src/database/indexes/`; schema changes are high risk and require explicit task scope, migration/compatibility analysis, and focused validation.
- Preserve the hot-reload-safe client singleton, retry behavior, observability hooks, and shutdown registration in `src/instrumentation.ts`.

## TypeScript

- Keep strict TypeScript clean; do not use `any`, unsafe casts, or suppression comments to bypass errors without a documented reason.
- Prefer `import type` for type-only imports and use the `@/` alias for cross-directory source imports.
- Keep server/client types serializable at React boundaries. Convert `ObjectId`, `Date`, and other MongoDB-specific values before passing them to Client Components or JSON responses.
- Follow the local quote/semicolon style because formatting is not fully consistent and no formatter is configured.

## Testing

- Unit tests are colocated as `src/**/*.unit.test.ts`; smoke tests use `src/**/*.smoke.test.ts`. Vitest runs them in the Node environment and tests commonly mock MongoDB and `server-only` boundaries.
- Playwright specs live in `tests/`. They run Chromium with one worker and no full parallelism to prevent database session conflicts; the configuration loads `.env` and starts `pnpm dev` if needed.
- Update or add focused tests whenever behavior changes, especially for authentication, authorization, validation, token/cookie handling, repositories, and API contracts.
- Run the narrowest relevant checks while iterating, then the applicable repository scripts before completion. API changes require the documentation and contract checks. UI/user-flow changes may require Playwright; security/data changes generally require unit tests and a build.
- Never rewrite a failing test merely to make it pass unless the expected behavior genuinely changed. Never claim an unexecuted or failed command passed.

## Security

- Treat auth, `src/proxy.ts`, `next.config.ts` security headers, `security-scan.js`, and deployment secret guards as sensitive code requiring extra review.
- Validate untrusted input, authenticate before sensitive work, authorize on the server, avoid user enumeration, and return generic public errors while logging safe server-side details.
- Use existing password/token crypto and cookie helpers. Never implement custom cryptography, store raw passwords or tokens, or log credentials, secrets, session cookies, reset/MFA codes, or authorization headers.
- Keep state-changing cookie-authenticated requests protected against CSRF/origin attacks. Preserve refresh-token rotation, family revocation, and reuse detection.
- Review the final diff for injection risks, privilege escalation, insecure direct-object references, secret exposure, unsafe redirects, and overly broad data returns.

## Environment variables

- `.env` is local and gitignored. `.env.example` is the only checked-in environment template. Never read secret values into reports, commit `.env*` files other than the safe example, or copy real values into documentation/tests.
- Central auth environment parsing and production guards live in `src/auth/config/env.ts`; database configuration also uses `src/database/config.ts`. Reuse these access points for their domains instead of scattering new secret reads.
- Never expose a server secret to a Client Component, browser bundle, or response. Never put sensitive values in a `NEXT_PUBLIC_*` variable.
- Update `.env.example` and deployment documentation only when a task explicitly introduces an environment variable, and use a non-secret placeholder. Keep `netlify.toml` free of secret values.

## Files requiring special care

- `AGENTS.md` and `CLAUDE.md`: `CLAUDE.md` delegates to this file; keep these instructions accurate.
- `node_modules/next/dist/docs/`: installed, version-matched Next.js documentation. Read the relevant guide before framework changes; do not edit it.
- `next.config.ts`, `src/proxy.ts`, `src/auth/**`, `src/database/**`, `security-scan.js`, `.husky/**`, and `netlify.toml`: security/deployment-sensitive.
- `.openapi/openapi.json`: generated by `pnpm docs:generate` and currently tracked. Do not hand-edit it. The executable generator is authoritative if older prose mentions another output location.
- `next-env.d.ts`, `.next/`, `tsconfig.tsbuildinfo`, `playwright-report/`, `test-results/`, and `security-scan-results/`: generated artifacts; do not hand-edit or use them as source of truth. Some report files are currently tracked, so inspect the diff after test runs.
- `pnpm-lock.yaml`: generated dependency lock; modify only with an explicitly authorized dependency change using pnpm.
- `src/database/schemas/` and `src/database/indexes/`: persistence contract and operational indexes; do not change incidentally.
- `public/assets/` and `src/assets/` both contain image collections. Inspect existing imports/URLs before adding or moving assets; do not reorganize them opportunistically.

## Documentation expectations

- Update relevant README/docs when a requested change alters setup, environment variables, architecture, authentication flows, database contracts, deployment, or developer commands.
- API changes must update the colocated `openapi.ts`, `src/lib/api/assemble.ts` when adding a path, and the generated artifact. Keep implementation validation and documented schemas/status/security in sync.
- Existing documents include historical plans and audits. Verify claims against current executable code and configuration before treating them as current conventions; do not silently rewrite historical records.
- Separate verified repository behavior from recommendations. When the repository is unclear, say so and follow the nearest comparable implementation with the smallest compatible change.

## Agent implementation workflow

1. Read this file, `package.json`, current `git status`, and the relevant installed Next.js 16 documentation before editing framework code.
2. Inspect multiple comparable routes/components/actions/services/tests. Do not promote a one-off pattern to a project rule.
3. Identify pre-existing uncommitted changes and preserve them. Do not overwrite, revert, or reformat unrelated user work.
4. State assumptions when the code does not establish a convention. Prefer nearby code and the smallest focused change.
5. Preserve the current architecture unless the task explicitly requests architectural change. Reuse existing UI, validation, DAL, service, repository, cookie, API, and test helpers.
6. Keep changes limited to the requested feature. Avoid unrelated refactors, renames, directory moves, dependency changes, and formatting churn.
7. Validate untrusted inputs and enforce authentication, authorization, and ownership at every server entry point. Do not weaken existing controls.
8. Add or update focused tests and API documentation when behavior changes.
9. Run the real applicable `package.json` scripts. Record exactly what ran and whether it passed, failed, or could not run due to environment prerequisites.
10. Review `git diff`, including generated or ignored-adjacent artifacts, before completing the task.

## Definition of done

A task is complete only when:

- the requested behavior is implemented with focused changes that match nearby code;
- runtime input validation and server-side authorization are present where needed;
- no server secret or sensitive data crosses a client/API boundary;
- relevant tests and API documentation are updated;
- applicable lint, test, documentation, and build scripts have been run, or any blocker is reported accurately;
- no dependency, generated artifact, environment, deployment, schema, route, or UI change occurred outside task scope;
- the final diff has been reviewed for correctness, security, accessibility, performance, and unrelated edits.

For performance, keep Client Component boundaries small, avoid unnecessary client state/effects and duplicate database calls, serialize only fields the client needs, use responsive `next/image` sizing, and do not add caching or dynamic rendering changes without checking the Next.js 16 behavior and the route's data-sensitivity requirements.

## Required completion report

Every completion report must include:

- a concise summary of what changed;
- files changed;
- application/runtime impact, including any routing, API, auth, database, dependency, environment, or configuration impact;
- commands actually run and their exact outcomes;
- tests not run and the reason;
- remaining uncertainties, risks, or follow-up recommendations, clearly separated from completed work.
