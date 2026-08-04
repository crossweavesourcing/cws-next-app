# SEO and Marketing Baseline (Phase 0)

## Route Inventory

| Route | Visibility | Indexable? | Render Strategy | Canonical | Metadata | Sitemap | Schema | Expected Status |
|---|---|---|---|---|---|---|---|---|
| `/` | Public | TBD (No robots.txt) | ISR (1h) | Missing | Title/Desc only | No | None | 200 |
| `/products` | Public | TBD | ISR (1h) | Missing | Partial | No | None | 200 |
| `/products/[slug]` | Public | TBD | SSG (1h) | Missing | Partial | No | None | 200 |
| `/catalogs/[slug]` | Public | TBD | SSR (Dynamic) | Missing | Missing | No | None | 200 |
| `/legal/privacy` | Public | TBD | Static | Missing | Missing | No | None | 200 |
| `/legal/terms` | Public | TBD | Static | Missing | Missing | No | None | 200 |
| `/legal/cookie-policy` | Public | TBD | Static | Missing | Missing | No | None | 200 |
| `/legal/accessibility` | Public | TBD | Static | Missing | Missing | No | None | 200 |
| `/dashboard/*` | Private | Risk (No X-Robots on dynamic) | SSR (Dynamic) | N/A | N/A | No | None | 307/200 |
| `/api/*` | Private | Risk | SSR (Dynamic) | N/A | N/A | No | None | 200/401 |

## Audit Reconciliation

- **Missing robots.txt and sitemap.xml**: Confirmed. Currently static `robots.txt` and `sitemap.xml` are built but they are just generic Next.js defaults or missing real dynamic data.
- **/dashboard and /api indexation risk**: Confirmed. `next.config.ts` adds `X-Robots-Tag: noindex, nofollow` to `/dashboard/:path*` and `/api/:path*`, but dynamic sitemap and robots.txt are lacking.
- **Image Optimization Disabled**: Confirmed partially: native `<img>` tags are used instead of `next/image` in several components (e.g. `TKOPage.tsx`), leading to missed LCP optimizations.
- **Homepage is 900-line Client Component**: Confirmed.
- **Missing ISR for product pages**: The build log shows `/products/[slug]` is SSG with `1h` revalidate (ISR). So this is partially implemented.
- **Missing JSON-LD**: Confirmed.
- **Accessibility (Missing labels, focus states, etc)**: Confirmed based on audit report and lint warnings.
- **Analytics and Conversion Tracking missing**: Confirmed.

## Missing Business Information (Blockers for later phases)
- Exact company address, phone, and contact email.
- Real social profiles.
- Verified certifications, company history, and testimonials.
- GTM Container ID / GA4 Measurement ID.
- Search Console / Bing Webmaster Tokens.
