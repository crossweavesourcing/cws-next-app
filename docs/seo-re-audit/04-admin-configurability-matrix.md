# 04 — Admin Configurability Matrix

| ID | Dashboard Module | Field | Exists in UI | Persists | Server Validated | Permission Checked | Used Publicly | Fallback Works | Cache Invalidated | Status |
| -- | ---------------- | ----- | -----------: | -------: | ---------------: | -----------------: | ------------: | -------------: | ----------------: | ------ |
| 1 | Global Settings | `siteName` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 2 | Global Settings | `defaultSeoTitle` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 3 | Global Settings | `defaultSeoDescription` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 4 | Global Settings | `defaultSocialImage` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 5 | Global Settings | `organizationName` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 6 | Global Settings | `organizationLegalName` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 7 | Global Settings | `organizationLogo` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 8 | Global Settings | `contactEmail` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 9 | Global Settings | `contactPhone` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 10 | Global Settings | `contactAddress` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 11 | Global Settings | `socialLinks` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 12 | Global Settings | `googleSiteVerification` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 13 | Global Settings | `bingSiteVerification` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 14 | Page SEO Overrides | `path` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 15 | Page SEO Overrides | `title` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 16 | Page SEO Overrides | `description` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 17 | Page SEO Overrides | `canonicalUrl` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 18 | Page SEO Overrides | `noindex` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 19 | Product SEO | `seoOverrides.title` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 20 | Product SEO | `seoOverrides.description` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 21 | Product SEO | `seoOverrides.canonicalUrl` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 22 | Product SEO | `seoOverrides.noindex` | Yes | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | FULLY_IMPLEMENTED |
| 23 | Category SEO | `seoOverrides.*` | No | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | PARTIAL (Missing Form UI) |
| 24 | Catalog SEO | `seoOverrides.*` | No | Yes | Yes | Yes (`admin`) | Yes | Yes | Yes | PARTIAL (Missing Form UI) |
