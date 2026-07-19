# API Documentation Architecture

**Date:** 2026-07-19
**Repository:** cws-next-app
**Status:** Plan (not yet implemented)

---

## 1. Selected Approach

### Stack

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Schema source | Zod | 4.4.3 (existing) | Runtime validation + type inference |
| OpenAPI generation | `zod-openapi` | ^5.4.6 | Zod → OpenAPI 3.1 schema conversion via `.meta()` |
| Spec file | `openapi.json` (generated) | — | Machine-readable API contract |
| Documentation UI | Scalar | `@scalar/nextjs-api-reference` | Interactive API reference (Swagger UI-like, modern) |
| Fallback UI | Redoc | `redoc` / `redoc-cli` | Static HTML fallback if Scalar is unavailable |
| OpenAPI linter | `@redocly/cli` lint | latest | Spec quality enforcement |
| Coverage checker | Custom script | — | Route → spec coverage audit |
| CI validation | Custom script | — | Generated file drift detection |

### Why this stack

1. **Zod is already installed** (v4.4.3). No new validation library needed.
2. **`zod-openapi` v5.4.6** has explicit Zod v4 support (uses `.meta()` for OpenAPI metadata). This is the only actively maintained Zod → OpenAPI bridge with v4 compatibility.
3. **`next-rest-framework` is rejected** due to known bugs with Next.js 16 (issue #218 type incompatibility, issue #222 bundled Zod version mismatch dropping `.min()`/`.max()` from generated schemas). These are correctness bugs that would silently produce incomplete OpenAPI specs.
4. **Scalar** provides a modern, interactive documentation UI that is OpenAPI 3.1-native. It is the recommended replacement for Swagger UI.
5. **Redoc** is the fallback for teams that prefer the classic three-panel layout or need static HTML export.
6. **No JSDoc-only approach** — schema-driven generation produces the most accurate, type-safe, and maintainable documentation.

---

## 2. Alternatives Considered

### 2.1 Next REST Framework

| Pros | Cons |
|---|---|
| Auto-generates OpenAPI from route handlers | **Broken with Next.js 16** (type errors, Zod version mismatch) |
| Built-in Swagger UI / Redoc | Bundles its own Zod copy, causing schema conversion bugs |
| Route-level configuration | Abstraction leak — harder to debug than manual spec generation |

**Verdict:** Rejected. See [issue #218](https://github.com/blomqma/next-rest-framework/issues/218) and [issue #222](https://github.com/blomqma/next-rest-framework/issues/222).

### 2.2 Hand-written OpenAPI YAML

| Pros | Cons |
|---|---|
| Full control over spec | Duplicated schema definitions (Zod + YAML) |
| No dependencies | Drifts from code inevitably |
| Works with any framework | No type safety |

**Verdict:** Rejected. Violates the "single source of truth" principle.

### 2.3 `@asteasolutions/zod-to-openapi`

| Pros | Cons |
|---|---|
| Mature, well-tested | Requires Zod v3 (not v4-compatible) |
| Decorator-based registration | Different API style from `.meta()` |

**Verdict:** Rejected. Not compatible with Zod v4's `.meta()` system.

### 2.4 `swagger-jsdoc` + JSDoc comments

| Pros | Cons |
|---|---|
| Comment-driven, no schema changes | No type safety; no runtime validation link |
| Familiar to many developers | Drifts from actual implementation |
| Works with any framework | JSDoc comments can lie; Zod schemas cannot |

**Verdict:** Rejected. Would only be recommended if schema-driven generation were technically impossible.

---

## 3. Compatibility Findings

| Component | Status | Notes |
|---|---|---|
| Next.js 16.2.7 | Compatible | `zod-openapi` is framework-agnostic; spec generation runs at build time or in a dedicated route |
| Zod 4.4.3 | Compatible | `zod-openapi` v5.4.6 requires Zod v4 (3.25.74+); uses `.meta()` natively |
| React 19.2.4 | Compatible | No React dependency in spec generation |
| Node.js 22 | Compatible | `zod-openapi` requires Node 20+ |
| MongoDB 6.x | Compatible | No database dependency in spec generation |
| App Router | Compatible | Spec can be served from a dedicated API route |
| Edge runtime | Not applicable | Spec generation should run in Node.js runtime (needs `zod-openapi` which uses Node APIs) |
| Netlify deployment | Compatible | `openapi.json` can be generated at build time or served dynamically |

---

## 4. Source of Truth

### Principle

**Zod schemas are the single source of truth for both runtime validation and API documentation.**

```
Zod Schema ──┬──► Runtime validation (in route handlers)
             ├──► TypeScript types (via z.infer)
             └──► OpenAPI schema (via zod-openapi .meta())
```

### What changes

1. **New Zod schemas** are defined for every API route's request body, query params, path params, and response.
2. **Existing manual validation** in route handlers is replaced with Zod schema parsing (`.parse()` or `.safeParse()`).
3. **OpenAPI metadata** (description, examples, tags, status codes) is attached via Zod's `.meta()` method.
4. **A central OpenAPI document** is assembled from all route schemas at build time.

### What does NOT change

- Route handler logic (authentication, authorization, business logic)
- Database schemas or models
- Frontend code
- Environment configuration
- Security posture

---

## 5. Generation Workflow

### 5.1 Build-time generation (recommended)

```
pnpm generate:openapi
  │
  ├─ 1. Import all route schemas from src/api/schemas/
  ├─ 2. Call createDocument() from zod-openapi
  ├─ 3. Write openapi.json to public/openapi.json
  └─ 4. CI verifies the generated file matches (drift detection)
```

### 5.2 File structure

```
src/
  api/
    schemas/
      index.ts                    # Barrel export of all route schemas
      health.schema.ts            # GET /api/health
      contact.schema.ts           # POST /api/contact
      chat.schema.ts              # POST /api/chat
      auth/
        logout.schema.ts          # POST /api/auth/logout
        refresh.schema.ts         # POST /api/auth/refresh
        google-start.schema.ts    # GET /api/auth/google
        google-callback.schema.ts # GET /api/auth/google/callback
        webauthn/
          login-options.schema.ts
          login-verify.schema.ts
      mobile/
        v1/
          auth/
            password.schema.ts
            me.schema.ts
            refresh.schema.ts
            google.schema.ts
            logout.schema.ts
            mfa/
              email.schema.ts
              totp.schema.ts
              webauthn/
                options.schema.ts
                verify.schema.ts
    openapi.ts                    # Document assembly (createDocument call)
scripts/
  generate-openapi.ts             # CLI script to generate openapi.json
public/
  openapi.json                    # Generated (gitignored or committed — see CI section)
```

### 5.3 Schema definition pattern

```typescript
// src/api/schemas/contact.schema.ts
import * as z from 'zod/v4';

export const ContactRequestSchema = z.object({
  name: z.string().min(1).max(100).meta({
    description: 'Full name of the sender',
    example: 'Jane Doe',
  }),
  email: z.string().email().max(255).meta({
    description: 'Email address',
    example: 'jane@example.com',
  }),
  subject: z.string().min(1).max(200).meta({
    description: 'Message subject line',
    example: 'Partnership Inquiry',
  }),
  message: z.string().min(1).max(5000).meta({
    description: 'Message body',
    example: 'I would like to discuss...',
  }),
});

export const ContactSuccessResponseSchema = z.object({
  success: z.literal(true).meta({ example: true }),
});

export const ContactErrorResponseSchema = z.object({
  success: z.literal(false).meta({ example: false }),
  error: z.string().meta({ example: 'All fields are required.' }),
});
```

---

## 6. Documentation UI

### 6.1 Scalar (primary)

Install `@scalar/nextjs-api-reference` and create a docs page:

```
src/app/docs/api/page.tsx  →  Renders Scalar with openapi.json
```

This provides:
- Interactive "Try it" panel
- Authentication input (Bearer token, cookie)
- Request/response examples
- Schema explorer
- OpenAPI 3.1 native rendering

### 6.2 Redoc (fallback)

For environments where Scalar cannot be used (e.g., static export), generate a static HTML file:

```bash
npx @redocly/cli build-docs public/openapi.json -o public/api-docs.html
```

### 6.3 Swagger UI (secondary fallback)

Only if stakeholders specifically request it. Scalar covers all Swagger UI use cases with a better UX.

### 6.4 Route for docs

| Route | Renderer | Access |
|---|---|---|
| `/docs/api` | Scalar | Public (no auth required) |
| `/docs/api/redoc` | Redoc (static) | Public |

---

## 7. Coverage-Enforcement Design

### 7.1 Route discovery

A custom script (`scripts/check-api-coverage.ts`) will:

1. Glob all `src/app/api/**/route.ts` files
2. Extract exported HTTP methods (`GET`, `POST`, etc.)
3. Compare against the OpenAPI spec's `paths` object
4. Report any routes/methods missing from the spec

### 7.2 Coverage report

```
API Coverage Report
═══════════════════
Total routes:  18
Documented:    18
Missing:        0
Coverage:     100%

Routes by difficulty:
  Easy:   11
  Medium:  6
  Hard:    1
```

### 7.3 CI integration

The coverage check runs in CI and **fails the build** if any route is undocumented:

```jsonc
// package.json
{
  "scripts": {
    "generate:openapi": "tsx scripts/generate-openapi.ts",
    "check:api-coverage": "tsx scripts/check-api-coverage.ts",
    "check:api-drift": "tsx scripts/check-api-drift.ts",
    "lint:openapi": "redocly lint public/openapi.json",
    "docs:build": "pnpm generate:openapi && pnpm lint:openapi && pnpm check:api-coverage"
  }
}
```

---

## 8. CI Design

### 8.1 No existing CI

This project has no CI pipeline. The following must be created:

### 8.2 Proposed workflow

```yaml
# .github/workflows/api-docs.yml
name: API Documentation
on:
  push:
    paths:
      - 'src/app/api/**'
      - 'src/api/schemas/**'
  pull_request:
    paths:
      - 'src/app/api/**'
      - 'src/api/schemas/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      # 1. Generate OpenAPI spec
      - run: pnpm generate:openapi

      # 2. Lint the spec
      - run: pnpm lint:openapi

      # 3. Check route coverage (fail if any route undocumented)
      - run: pnpm check:api-coverage

      # 4. Check for drift (generated file is committed and matches)
      - run: pnpm check:api-drift
```

### 8.3 Generated file strategy

Two options:

**Option A (recommended): Commit `openapi.json`**
- Pros: Docs are always available without a build step; PRs show spec changes in diff
- Cons: Spec can drift if someone forgets to regenerate
- Mitigation: `check:api-drift` fails CI if generated file doesn't match source

**Option B: Gitignore `openapi.json`, generate on build**
- Pros: No drift possible
- Cons: Docs unavailable without build; Netlify build must include generation step
- Mitigation: Add `generate:openapi` to build script

**Recommendation:** Option A. The drift checker catches forgotten regenerations, and committed specs enable easy review.

---

## 9. Security Design

### 9.1 Documentation route access

| Route | Auth required | Notes |
|---|---|---|
| `/docs/api` (Scalar) | No | Public API reference |
| `/openapi.json` | No | Public spec file |

**Rationale:** API documentation is typically public. The spec describes the contract, not secrets. Authentication/authorization details are documented as part of the spec (security schemes), not as access controls on the docs themselves.

### 9.2 Security scheme definitions

The OpenAPI spec will define these security schemes:

```yaml
components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: cws_session
      description: HMAC-signed session cookie (web dashboard)
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Ed25519-signed JWT (mobile API)
    csrfGuard:
      type: apiKey
      in: header
      name: Origin
      description: Same-origin CSRF protection (web state-changing routes)
```

### 9.3 Sensitive data handling

- **System prompts** (chat route): Document the endpoint shape; do NOT include the system prompt content in examples
- **OAuth secrets**: Never appear in the spec; only the redirect flow is documented
- **Session tokens**: Documented as `<redacted>` in examples
- **Database internals**: Health endpoint documents the response shape, not the database technology
- **Internal rates**: Rate limits are documented (e.g., "20 attempts per 15 minutes") but implementation details (MongoDB-backed counter) are not

### 9.4 Env var exposure

The OpenAPI spec must NOT include:
- `MONGODB_URI`
- `SESSION_SECRET`
- `ARGON2_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `EMAIL_PASSWORD`
- `ADMIN_SEED_PASSWORD`
- `MOBILE_JWT_PRIVATE_KEY_B64`
- Any other secret

These are never in request/response schemas. They are configuration, not API contract.

---

## 10. Migration Phases

### Phase 0: Infrastructure Setup (low risk)

**Goal:** Install dependencies, create file structure, set up scripts.

| Step | Action | Files |
|---|---|---|
| 0.1 | Install `zod-openapi` | `package.json`, `pnpm-lock.yaml` |
| 0.2 | Install `@scalar/nextjs-api-reference` | `package.json`, `pnpm-lock.yaml` |
| 0.3 | Install `@redocly/cli` as devDependency | `package.json`, `pnpm-lock.yaml` |
| 0.4 | Create `src/api/schemas/` directory structure | New directories |
| 0.5 | Create `src/api/schemas/index.ts` barrel | `src/api/schemas/index.ts` |
| 0.6 | Create `src/api/openapi.ts` document assembly | `src/api/openapi.ts` |
| 0.7 | Create `scripts/generate-openapi.ts` | `scripts/generate-openapi.ts` |
| 0.8 | Add npm scripts to `package.json` | `package.json` |
| 0.9 | Create docs page at `src/app/docs/api/page.tsx` | `src/app/docs/api/page.tsx` |

### Phase 1: Schema Definition — Easy Routes (low risk)

**Goal:** Define Zod schemas for the 11 easy routes.

| Step | Route | Schema file |
|---|---|---|
| 1.1 | `GET /api/health` | `src/api/schemas/health.schema.ts` |
| 1.2 | `POST /api/contact` | `src/api/schemas/contact.schema.ts` |
| 1.3 | `POST /api/auth/logout` | `src/api/schemas/auth/logout.schema.ts` |
| 1.4 | `POST /api/auth/refresh` | `src/api/schemas/auth/refresh.schema.ts` |
| 1.5 | `GET /api/auth/google` | `src/api/schemas/auth/google-start.schema.ts` |
| 1.6 | `GET /api/mobile/v1/auth/me` | `src/api/schemas/mobile/v1/auth/me.schema.ts` |
| 1.7 | `POST /api/mobile/v1/auth/refresh` | `src/api/schemas/mobile/v1/auth/refresh.schema.ts` |
| 1.8 | `POST /api/mobile/v1/auth/google` | `src/api/schemas/mobile/v1/auth/google.schema.ts` |
| 1.9 | `POST /api/mobile/v1/auth/logout` | `src/api/schemas/mobile/v1/auth/logout.schema.ts` |
| 1.10 | `POST /api/mobile/v1/auth/mfa/email` | `src/api/schemas/mobile/v1/auth/mfa/email.schema.ts` |
| 1.11 | `POST /api/mobile/v1/auth/mfa/totp` | `src/api/schemas/mobile/v1/auth/mfa/totp.schema.ts` |

### Phase 2: Schema Definition — Medium Routes (medium risk)

**Goal:** Define Zod schemas for the 6 medium routes.

| Step | Route | Schema file |
|---|---|---|
| 2.1 | `POST /api/chat` | `src/api/schemas/chat.schema.ts` |
| 2.2 | `POST /api/auth/webauthn/login-options` | `src/api/schemas/auth/webauthn/login-options.schema.ts` |
| 2.3 | `POST /api/auth/webauthn/login-verify` | `src/api/schemas/auth/webauthn/login-verify.schema.ts` |
| 2.4 | `POST /api/mobile/v1/auth/password` | `src/api/schemas/mobile/v1/auth/password.schema.ts` |
| 2.5 | `POST /api/mobile/v1/auth/mfa/webauthn/options` | `src/api/schemas/mobile/v1/auth/mfa/webauthn/options.schema.ts` |
| 2.6 | `POST /api/mobile/v1/auth/mfa/webauthn/verify` | `src/api/schemas/mobile/v1/auth/mfa/webauthn/verify.schema.ts` |

### Phase 3: Schema Definition — Hard Routes (medium risk)

**Goal:** Define Zod schemas for the 1 hard route.

| Step | Route | Schema file |
|---|---|---|
| 3.1 | `GET /api/auth/google/callback` | `src/api/schemas/auth/google-callback.schema.ts` |

### Phase 4: Document Assembly & Generation (low risk)

**Goal:** Wire schemas into the OpenAPI document and verify generation.

| Step | Action |
|---|---|
| 4.1 | Complete `src/api/openapi.ts` — assemble all schemas into `createDocument()` |
| 4.2 | Run `pnpm generate:openapi` — verify `public/openapi.json` is generated |
| 4.3 | Open in Scalar UI — visually verify all routes appear |
| 4.4 | Validate with `redocly lint public/openapi.json` |

### Phase 5: Route Handler Integration (medium risk)

**Goal:** Replace manual validation in route handlers with Zod schema parsing.

| Step | Action | Risk |
|---|---|---|
| 5.1 | Replace inline validation in `/api/contact` with `ContactRequestSchema.parse()` | Low |
| 5.2 | Replace `!message` check in `/api/chat` with schema parse | Low |
| 5.3 | Replace `typeof` checks in mobile routes with schema parse | Low |
| 5.4 | Replace cookie/body checks in web auth routes with schema parse | Medium |
| 5.5 | Replace query param checks in `/api/auth/google/callback` with schema parse | Medium |
| 5.6 | Run existing tests to verify no regressions | — |

### Phase 6: Coverage & CI (low risk)

**Goal:** Enforce coverage and drift detection.

| Step | Action |
|---|---|
| 6.1 | Create `scripts/check-api-coverage.ts` |
| 6.2 | Create `scripts/check-api-drift.ts` |
| 6.3 | Add CI workflow (`.github/workflows/api-docs.yml`) |
| 6.4 | Verify CI fails on undocumented route |
| 6.5 | Verify CI fails on drift |

### Phase 7: Documentation Polish (low risk)

**Goal:** Finalize documentation quality.

| Step | Action |
|---|---|
| 7.1 | Add descriptions and examples to all schemas |
| 7.2 | Add security scheme definitions to OpenAPI doc |
| 7.3 | Add error response schemas for all routes |
| 7.4 | Generate Redoc static fallback |
| 7.5 | Update `docs/` with API documentation guide |

---

## 11. Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| `zod-openapi` v5 has undiscovered Zod v4 edge cases | Medium | Low | Test with all 18 routes; fallback to manual spec |
| Existing tests break when manual validation is replaced with Zod parse | Medium | Medium | Phase 5 is last; run full test suite before/after |
| Google callback route has complex branching (MFA/step-up/force-change) | Low | Medium | Document each branch separately in the schema |
| WebAuthn types (`AuthenticationResponseJSON`) are complex to represent in Zod | Low | Medium | Use `z.custom<AuthenticationResponseJSON>()` with OpenAPI override |
| Scalar UI has compatibility issues with Next.js 16 | Low | Low | Fallback to Redoc |
| No CI exists — adding CI is a prerequisite | Medium | Certain | Phase 0 includes CI setup |
| Developers forget to regenerate `openapi.json` after route changes | Medium | High | CI drift check; pre-commit hook suggestion |
| `openapi.json` becomes large (18 routes × request + response schemas) | Low | Low | OpenAPI spec will be <100KB; not a concern |

---

## 12. Files Expected to Change

### New files (created)

| File | Purpose |
|---|---|
| `src/api/schemas/index.ts` | Barrel export of all route schemas |
| `src/api/schemas/health.schema.ts` | Health endpoint schemas |
| `src/api/schemas/contact.schema.ts` | Contact endpoint schemas |
| `src/api/schemas/chat.schema.ts` | Chat endpoint schemas |
| `src/api/schemas/auth/logout.schema.ts` | Logout schemas |
| `src/api/schemas/auth/refresh.schema.ts` | Refresh schemas |
| `src/api/schemas/auth/google-start.schema.ts` | Google OAuth start schemas |
| `src/api/schemas/auth/google-callback.schema.ts` | Google OAuth callback schemas |
| `src/api/schemas/auth/webauthn/login-options.schema.ts` | WebAuthn login options schemas |
| `src/api/schemas/auth/webauthn/login-verify.schema.ts` | WebAuthn login verify schemas |
| `src/api/schemas/mobile/v1/auth/password.schema.ts` | Mobile password login schemas |
| `src/api/schemas/mobile/v1/auth/me.schema.ts` | Mobile user profile schemas |
| `src/api/schemas/mobile/v1/auth/refresh.schema.ts` | Mobile token refresh schemas |
| `src/api/schemas/mobile/v1/auth/google.schema.ts` | Mobile Google login schemas |
| `src/api/schemas/mobile/v1/auth/logout.schema.ts` | Mobile logout schemas |
| `src/api/schemas/mobile/v1/auth/mfa/email.schema.ts` | Mobile email MFA schemas |
| `src/api/schemas/mobile/v1/auth/mfa/totp.schema.ts` | Mobile TOTP MFA schemas |
| `src/api/schemas/mobile/v1/auth/mfa/webauthn/options.schema.ts` | Mobile WebAuthn options schemas |
| `src/api/schemas/mobile/v1/auth/mfa/webauthn/verify.schema.ts` | Mobile WebAuthn verify schemas |
| `src/api/openapi.ts` | OpenAPI document assembly |
| `scripts/generate-openapi.ts` | CLI script for spec generation |
| `scripts/check-api-coverage.ts` | Route coverage checker |
| `scripts/check-api-drift.ts` | Generated file drift detector |
| `src/app/docs/api/page.tsx` | Scalar documentation page |
| `public/openapi.json` | Generated OpenAPI spec |
| `.github/workflows/api-docs.yml` | CI workflow |

### Modified files

| File | Change |
|---|---|
| `package.json` | New dependencies + scripts |
| `src/app/api/contact/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/chat/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/password/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/mfa/email/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/mfa/totp/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/mfa/webauthn/options/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/mfa/webauthn/verify/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/me/route.ts` | Add response type documentation |
| `src/app/api/mobile/v1/auth/refresh/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/google/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/mobile/v1/auth/logout/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/auth/webauthn/login-options/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/auth/webauthn/login-verify/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/auth/logout/route.ts` | Add response type documentation |
| `src/app/api/auth/refresh/route.ts` | Add response type documentation |
| `src/app/api/auth/google/route.ts` | Add redirect documentation |
| `src/app/api/auth/google/callback/route.ts` | Replace manual validation with Zod parse |
| `src/app/api/health/route.ts` | Add response type documentation |

---

## 13. Dependencies to Install

### Production dependencies

| Package | Version | Purpose |
|---|---|---|
| `zod-openapi` | `^5.4.6` | Zod v4 → OpenAPI 3.1 schema conversion |

### Development dependencies

| Package | Version | Purpose |
|---|---|---|
| `@scalar/nextjs-api-reference` | `^0.5.0` | Scalar documentation UI for Next.js |
| `@redocly/cli` | `^1.25.0` | OpenAPI linter + Redoc static HTML generation |
| `tsx` | `^4.23.0` (existing) | TypeScript script execution (already installed) |

### Peer dependencies (already satisfied)

| Package | Required | Installed |
|---|---|---|
| `zod` | `^4.0.0` | `4.4.3` ✓ |
| `next` | `>=13` | `16.2.7` ✓ |
| `typescript` | `>=3` | `^5` ✓ |
| `node` | `>=20` | `22` ✓ |

---

## 14. Routes Proposed for Explicit Exclusion

**None.** All 18 routes will be documented. No route is excluded due to difficulty.

However, the following routes have special documentation considerations:

| Route | Consideration |
|---|---|
| `/api/health` | Document response shape only; no auth/security schemes |
| `/api/chat` | Document endpoint contract; do NOT include system prompt content in examples |
| `/api/auth/google/callback` | Document as redirect-based flow; examples use `302` responses, not JSON |
| `/api/auth/google` | Document as redirect initiation; example shows `302` to Google |
| All mobile OPTIONS handlers | Document as CORS preflight; no request/response body |

---

## 15. Implementation Plan (Ordered by Dependency and Risk)

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7
  │            │            │            │            │            │            │            │
  │            │            │            │            │            │            │            │
  ▼            ▼            ▼            ▼            ▼            ▼            ▼            ▼
Install     Schema      Schema      Schema      Assemble     Replace     Enforce     Polish
deps +      easy        medium      hard        + generate   manual      coverage    docs
scripts     routes      routes      routes      + verify     validation  + CI
```

### Dependency chain

1. **Phase 0** is a prerequisite for everything (installs `zod-openapi`, creates schema structure).
2. **Phases 1–3** are independent of each other (can be parallelized) but all depend on Phase 0.
3. **Phase 4** depends on Phases 1–3 (needs all schemas to assemble the document).
4. **Phase 5** depends on Phase 4 (schemas must exist before route handlers can use them for validation).
5. **Phase 6** depends on Phase 4 (coverage checker needs the generated spec).
6. **Phase 7** depends on Phases 4–6 (polish happens after the pipeline works).

### Risk ordering

- **Phase 0**: Zero risk (only adds files, changes nothing in existing code).
- **Phase 1**: Zero risk (only adds schema files, no existing code modified).
- **Phase 2**: Zero risk (only adds schema files).
- **Phase 3**: Zero risk (only adds schema files).
- **Phase 4**: Low risk (generates a file; no existing code modified).
- **Phase 5**: **Medium risk** (modifies existing route handlers; must run full test suite).
- **Phase 6**: Low risk (adds CI scripts; no existing code modified).
- **Phase 7**: Zero risk (documentation polish only).

### Estimated effort

| Phase | Estimated time |
|---|---|
| Phase 0 | 30 minutes |
| Phase 1 | 1–2 hours |
| Phase 2 | 1–2 hours |
| Phase 3 | 30 minutes |
| Phase 4 | 1 hour |
| Phase 5 | 2–3 hours |
| Phase 6 | 1 hour |
| Phase 7 | 1 hour |
| **Total** | **8–11 hours** |

---

## 16. Verification Checklist

After implementation, verify:

- [ ] `pnpm generate:openapi` produces valid `openapi.json`
- [ ] `pnpm lint:openapi` passes (no spec errors)
- [ ] `pnpm check:api-coverage` reports 100% coverage
- [ ] `pnpm check:api-drift` passes (generated file matches source)
- [ ] Scalar UI loads at `/docs/api` and shows all 18 routes
- [ ] All existing tests pass (`pnpm test:unit`, `pnpm test:e2e`)
- [ ] `pnpm build` succeeds
- [ ] Manual verification: each route's request/response in Scalar matches actual behavior
