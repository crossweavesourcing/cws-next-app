# Master Parameter Inventory — Complete SEO Inventory

## Overview
This master inventory classifies every SEO parameter evaluated across 20 modules into four mutually exclusive categories:
1. **Dashboard Configurable**
2. **Automatically Generated**
3. **Developer-Controlled**
4. **Not Applicable**

## Master Inventory Table

| ID | Module | Parameter | Applicable | Dashboard Configurable | Automatic | Developer Controlled | Access Role | Current Implementation | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| G-01 | Global SEO | Site Name | Yes | Yes | No | No | Admin | `SeoConfig.siteName` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-02 | Global SEO | Brand Name | Yes | Yes | No | No | Admin | `SeoConfig.brandName` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-03 | Global SEO | Default Title | Yes | Yes | No | No | Admin | `SeoConfig.defaultTitle` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-04 | Global SEO | Title Template | Yes | Yes | No | No | Admin | `SeoConfig.titleTemplate` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-05 | Global SEO | Default Meta Description | Yes | Yes | No | No | Admin | `SeoConfig.defaultDescription` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-06 | Global SEO | Default Social Image | Yes | Yes | No | No | Admin | `SeoConfig.defaultOgImage` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-07 | Global SEO | Company Legal Name | Yes | Yes | No | No | Admin | `SeoConfig.organization.name` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-08 | Global SEO | Public Email | Yes | Yes | No | No | Admin | `SeoConfig.organization.email` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-09 | Global SEO | Public Phone | Yes | Yes | No | No | Admin | `SeoConfig.organization.phone` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-10 | Global SEO | Google Search Verification | Yes | Yes | No | No | Admin | `SeoConfig.verification.google` via `/dashboard/seo` | `FULLY_VERIFIED` |
| G-11 | Global SEO | Bing Search Verification | Yes | Yes | No | No | Admin | `SeoConfig.verification.bing` via `/dashboard/seo` | `FULLY_VERIFIED` |
| P-01 | Product SEO | SEO Title Override | Yes | Yes | No | No | Admin | `Product.seoTitle` via `/dashboard/products/[id]/edit` | `FULLY_VERIFIED` |
| P-02 | Product SEO | Meta Description Override | Yes | Yes | No | No | Admin | `Product.seoDescription` via `/dashboard/products/[id]/edit` | `FULLY_VERIFIED` |
| P-03 | Product SEO | Canonical Override | Yes | Yes | No | No | Admin | `Product.canonical` via `/dashboard/products/[id]/edit` | `FULLY_VERIFIED` |
| P-04 | Product SEO | Indexing Control (noindex) | Yes | Yes | No | No | Admin | `Product.noindex` via `/dashboard/products/[id]/edit` | `FULLY_VERIFIED` |
| C-01 | Catalog SEO | Catalog SEO Title | Yes | Yes | No | No | Admin | `Catalog.seoTitle` via EditCatalogModal | `FULLY_VERIFIED` |
| C-02 | Catalog SEO | Catalog Meta Description | Yes | Yes | No | No | Admin | `Catalog.seoDescription` via EditCatalogModal | `FULLY_VERIFIED` |
| K-01 | Category SEO | Category SEO Title | Yes | Yes | No | No | Admin | `Category.seoTitle` via Category Modal | `FULLY_VERIFIED` |
| R-01 | Redirects | Source / Destination Path | Yes | Yes | No | No | Admin | Redirect Repository & Proxy Handler | `FULLY_VERIFIED` |
| A-01 | Auto SEO | XML Sitemap Generation | Yes | No | Yes | No | System | `src/app/sitemap.ts` dynamic route generation | `AUTOMATIC_VERIFIED` |
| A-02 | Auto SEO | Robots.txt Generation | Yes | No | Yes | No | System | `src/app/robots.ts` dynamic rules generation | `AUTOMATIC_VERIFIED` |
| A-03 | Auto SEO | JSON-LD Schema Generation | Yes | No | Yes | No | System | `src/lib/seo/metadata.ts` schema builders | `AUTOMATIC_VERIFIED` |
| D-01 | Dev Control | Canonical Origin (`APP_URL`) | Yes | No | No | Yes | Dev/Env | `.env` variable `NEXT_PUBLIC_APP_URL` | `DEVELOPER_CONTROLLED_VERIFIED` |
| D-02 | Dev Control | CSP & Security Headers | Yes | No | No | Yes | Dev/Env | `src/proxy.ts` / Next.js config | `DEVELOPER_CONTROLLED_VERIFIED` |
| D-03 | Dev Control | GTM / GA4 Measurement IDs | Yes | No | No | Yes | Dev/Env | `.env` variables `NEXT_PUBLIC_GTM_ID` | `DEVELOPER_CONTROLLED_VERIFIED` |
| N-01 | Not App. | Ecommerce Cart / Checkout | No | No | No | No | N/A | B2B catalog site; direct checkout N/A | `NOT_APPLICABLE` |

*Note: The complete master list of 110 parameters is maintained and fully documented across the individual domain verification reports.*
