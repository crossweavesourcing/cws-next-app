# Runtime Test Results

This document records the output of the automated verifications run against the codebase.

## 1. Static Analysis & Linting

### `pnpm lint`
- **Result**: Passed with 0 errors, 29 warnings.
- **Findings**:
  - 8 warnings for `next/next/no-img-element` in `TKOPage.tsx` and CMS dashboard components. Using `<img>` instead of `<Image>` bypasses Next.js optimization.
  - Several unused variables (`@typescript-eslint/no-unused-vars`) in test files, API handlers, and `scripts/db-init.ts`.

### `npx tsc --noEmit`
- **Result**: Failed (Exit code 2).
- **Findings**:
  - TS2307: Missing module for `../../src/app/(admin)/dashboard/catalogs/[id]/review/page.js` in `.next/types/validator.ts`.
  - TS2694: `Namespace 'global.jest' has no exported member 'Mocked'` across multiple unit test files (`admin.service.unit.test.ts`, `category.service.unit.test.ts`).
  - TS2345: Promise assignment errors in test mocks.
  - TS2339: Missing properties `rotatingWords` and `background` in `section-definitions.unit.test.ts`.

## 2. Unit Testing

### `pnpm test:unit`
- **Result**: Passed.
- **Metrics**: 43 test files, 248 tests passed. 
- **Notes**: All authentication, rate-limiting, risk scoring, and security sink tests are functional.

## 3. Production Build (`pnpm build`)

- **Result**: Passed (Compiled successfully in 8.2s).
- **Security Scan**: Passed (0 Critical, 0 High, 1 Medium, 20 Low).
- **Rendering Insights**:
  - Static HTML (`○`): `/`, `/products`, `/apple-icon.png`, `/icon.png`, `/dashboard/forgot-password`.
  - SSG (`●`): `/products/[slug]`.
  - Dynamic SSR (`ƒ`): `/catalogs/[slug]`, `/dashboard/*`, `/api/*`.

## 4. Runtime Headers (`pnpm start`)

- **Command**: `curl -I http://localhost:3001` (Homepage)
- **Status**: `200 OK`
- **Headers**:
  ```http
  Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
  x-nextjs-cache: HIT
  x-nextjs-prerender: 1
  x-nextjs-stale-time: 300
  X-Powered-By: Next.js
  Cache-Control: s-maxage=31536000
  Content-Type: text/html; charset=utf-8
  ```
| Route Pattern | Result (HTTP Status) | Security Headers Configured |
|---|---|---|
| `GET /` | `200 OK` | (Intentionally Excluded) |
| `GET /dashboard` | `307 Temporary Redirect` -> `/dashboard/login` | **Present** (CSP, X-Frame-Options) |
| `GET /dashboard/login` | `200 OK` | **Present** (Includes `X-Robots-Tag: noindex, nofollow`) |
| `GET /api/health` | `200 OK` | **Present** (Includes `X-Robots-Tag: noindex, nofollow`) |
| `GET /robots.txt` | `200 OK` | Valid, excludes `/dashboard/` and `/api/` |
| `GET /sitemap.xml` | `200 OK` | Valid, includes published products |
- **Findings**:
  - Static caching (`x-nextjs-cache: HIT`) is working perfectly for the homepage.
  - No security headers (CSP, X-Frame-Options) are served on the public homepage. This aligns with `next.config.ts`, which restricts security headers exclusively to `/dashboard/*` and `/api/*`.

## 5. Accessibility Testing (`tests/a11y.spec.ts`)

- **Command**: `pnpm run test:e2e tests/a11y.spec.ts`
- **Result**: Passed.
- **Findings**:
  - `axe-core` verified the Homepage and Products list page.
  - Zero automatically detectable WCAG AA violations found.
  - Color contrast violations on brand-red text resolved by adapting shade brightness according to the background.
