# 07 — Developer-Only Controls

This document verifies that critical technical SEO and security configurations remain protected in code or environment variables and have not been accidentally exposed to admin users.

| Control | Implementation Location | Exposed in Admin? | Status | Security / Stability Justification |
| ------- | ----------------------- | ----------------: | ------ | ----------------------------------- |
| Canonical Base Origin (`APP_URL`) | `.env` / `src/auth/config/env.ts` | No | PASS | Prevents admins from accidently de-indexing or spoofing domain origins. |
| Sitemap Generator (`/sitemap.ts`) | `src/app/sitemap.ts` | No | PASS | Automated schema generation ensures valid XML and prevents broken links. |
| Robots Rule Generator | `src/app/robots.ts` | No | PASS | Protects private routes (`/dashboard/`) from accidental removal by admins. |
| Raw JSON-LD Injection | `src/lib/seo/schema-builders.ts` | No | PASS | Structured data is built strictly from validated fields, preventing XSS injection. |
| Security Headers & CSP | `src/proxy.ts` | No | PASS | Enforces strict content security policies and origin isolation. |
| Revalidation & Cache Timing | Route segment `export const revalidate = 3600;` | No | PASS | Governed by infrastructure caching guidelines. |
