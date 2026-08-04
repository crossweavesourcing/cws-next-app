# 02 — Route Inventory

| Route | Public/Private | Exists | Rendering Strategy | Data Source | Indexable | Metadata Source | Schema | Sitemap | Dashboard Configurable | Runtime Status |
| ----- | -------------- | -----: | ------------------ | ----------- | --------: | --------------- | ------ | ------: | ---------------------: | -------------- |
| `/` | Public | Yes | SSG (ISR: 1h) | MongoDB (`page_seo`, `global_settings`) | Yes | `generateMetadata` (`PageSeo` / Global) | `Organization`, `WebSite` | Yes | Yes (`/dashboard/seo`) | PASS (200 OK) |
| `/products` | Public | Yes | SSG (ISR: 1h) | MongoDB (`products`, `page_seo`) | Yes | `generateMetadata` (`PageSeo` / Global) | `BreadcrumbList`, `ItemList` | Yes | Yes (`/dashboard/seo`) | PASS (200 OK) |
| `/products/[slug]` | Public | Yes | SSG (ISR: 1h) | MongoDB (`products`) | Yes | `generateMetadata` (`Product.seoOverrides`) | `Product`, `BreadcrumbList` | Yes | Yes (`/dashboard/products`) | PASS (200 OK) |
| `/catalogs/[slug]` | Public | Yes | Dynamic (SSR) | MongoDB (`catalog_documents`) | Yes | `generateMetadata` (`seoOverrides` / Global) | `BreadcrumbList` | Yes | Partial (Schema supports, missing form inputs) | PASS (200 OK) |
| `/legal/terms` | Public | Yes | Static | Static / Global Settings | Yes | `generateMetadata` (`PageSeo` / Global) | `WebPage` | Yes | Yes (`/dashboard/seo`) | PASS (200 OK) |
| `/legal/privacy` | Public | Yes | Static | Static / Global Settings | Yes | `generateMetadata` (`PageSeo` / Global) | `WebPage` | Yes | Yes (`/dashboard/seo`) | PASS (200 OK) |
| `/legal/cookie-policy` | Public | Yes | Static | Static / Global Settings | Yes | Static / Global | `WebPage` | Yes | Partial | PASS (200 OK) |
| `/legal/accessibility` | Public | Yes | Static | Static / Global Settings | Yes | Static / Global | `WebPage` | Yes | Partial | PASS (200 OK) |
| `/robots.txt` | Public | Yes | Dynamic Endpoint | Generator (`robots.ts`) | No | N/A | N/A | No | No (System-generated) | PASS (200 OK) |
| `/sitemap.xml` | Public | Yes | Dynamic Endpoint | Generator (`sitemap.ts`) | No | N/A | N/A | No | No (System-generated) | PASS (200 OK) |
| `/dashboard` | Private | Yes | Dynamic (SSR) | Active Session | No (`X-Robots-Tag`) | Dashboard Layout | N/A | No | N/A | PASS (302 Redirect to `/dashboard/login` when unauth) |
| `/dashboard/login` | Private | Yes | Dynamic (SSR) | Session DAL | No (`X-Robots-Tag`) | Dashboard Layout | N/A | No | N/A | PASS (200 OK) |
| `/dashboard/seo` | Private | Yes | Dynamic (SSR) | MongoDB (`global_settings`, `page_seo`) | No | Dashboard Layout | N/A | No | N/A | PASS (200 OK) |
| `/dashboard/products` | Private | Yes | Dynamic (SSR) | MongoDB (`products`) | No | Dashboard Layout | N/A | No | N/A | PASS (200 OK) |
| `/dashboard/categories` | Private | Yes | Dynamic (SSR) | MongoDB (`categories`) | No | Dashboard Layout | N/A | No | N/A | PASS (200 OK) |
| `/dashboard/catalogs` | Private | Yes | Dynamic (SSR) | MongoDB (`catalog_documents`) | No | Dashboard Layout | N/A | No | N/A | PASS (200 OK) |
| `/api/*` | Private/API | Yes | Dynamic API | MongoDB | No (`X-Robots-Tag`) | N/A | N/A | No | N/A | PASS (200 OK / 401 Unauth) |

## Summary of Non-Existent Routes
- `/categories/[slug]`: Categories exist in the database and dashboard, but do not currently have dedicated public frontend details pages. Category filtering occurs directly on `/products?category=...`.
- `/about`: Handled as an anchor section (`#about`) on the main landing page (`/`).
- `/contact`: Handled as an anchor section (`#contact`) on the main landing page (`/`).
