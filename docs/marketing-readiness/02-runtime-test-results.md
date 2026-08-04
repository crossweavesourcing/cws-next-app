# Runtime Test Results (Baseline)

## Build Output
- Build succeeded in 10.5s.
- 47 Test files passed (264 total tests).
- Linting failed with 4 errors and 32 warnings (mostly `<img>` usage and `<a>` usage instead of `next/link` or `next/image`).
- Typechecking succeeded.

## Render Strategies
- `/`: ISR (1h)
- `/products`: ISR (1h)
- `/products/[slug]`: SSG/ISR (1h)
- `/dashboard/*`: Dynamic (SSR)
- `/api/*`: Dynamic (SSR)
- `/legal/*`: Static
- `/catalogs/[slug]`: Dynamic (SSR)

## HTTP Headers (from next.config.ts & middleware)
- Public routes: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Private routes (`/dashboard`, `/api`): Strict CSP, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow`.

## Performance & Accessibility (Lighthouse)
*Note: Browser-based automated Lighthouse tooling was not available in this CLI environment. To be captured manually or in Phase 11.*
