# 06 — Automatic SEO Verification

This document audits all automated SEO systems in the application to verify that default fallbacks, schema builders, dynamic URL generators, and crawler protection function without requiring manual admin intervention.

| Behavior | Source Data | Fallback | Runtime Result | Edge Cases | Status |
| -------- | ----------- | -------- | -------------- | ---------- | ------ |
| Canonical URL | Page URL or `seoOverrides.canonicalUrl` | `APP_URL + path` | `https://crossweavesourcing.com/products/canvas-utility-tote` | Trailing slash normalized | PASS |
| Open Graph Image | `product.images[0]` or `product.image` | `globalSettings.defaultSocialImage` or `/og-image.jpg` | Absolute image URL rendered in `og:image` | Handles empty array gracefully | PASS |
| Breadcrumb JSON-LD | Product / Category / Catalog hierarchy | Generic Home > Products path | Valid `BreadcrumbList` schema rendered | Root path handled cleanly | PASS |
| Sitemap `lastModified` | `updatedAt` or `createdAt` timestamp from DB | Current execution timestamp | Valid ISO 8601 string in `<lastmod>` | Missing timestamps use `new Date()` | PASS |
| Unpublished Filtering | `product.status === 'published'` | Excluded from sitemap and listing | Draft items excluded from sitemap and return 404 on public route | Direct URL access returns 404 | PASS |
| Staging Noindex Header | `src/proxy.ts` | `X-Robots-Tag: noindex, nofollow` when `NEXT_PUBLIC_APP_ENV !== 'production'` | Header present on non-prod environments | Production environment removes header | PASS |
| Private Route Disallow | `/dashboard/*` and `/api/*` | Disallowed in `robots.ts` | Search crawlers blocked from admin & API surfaces | Public endpoints like `/api/contact` remain reachable | PASS |
