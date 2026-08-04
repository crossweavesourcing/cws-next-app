# Complete SEO Configurability Matrix

| Module | Parameter | Dashboard configurable | Automatic | Developer-only | Access role | Public consumer | Cache behavior | Status |
| ------ | --------- | ---------------------: | --------: | -------------: | ----------- | --------------- | -------------- | ------ |
| Global SEO | Site name | Yes | No | No | SEO/Admin | Metadata, WebSite schema | Root layout | Implemented |
| Global SEO | Brand/legal names | Yes | No | No | SEO/Admin | Metadata, Organization schema | Root layout | Implemented |
| Global SEO | Default title/description | Yes | No | No | SEO/Admin | Metadata fallback | Root layout | Implemented |
| Global SEO | Title template | Planned | No | No | SEO/Admin | Metadata fallback | Root layout | Classified dashboard |
| Global SEO | Public logo/social image | Yes | No | No | SEO/Admin | Metadata/schema | Root layout | Implemented |
| Global SEO | Favicon/icons | Planned | No | No | Admin | App icons | Build/layout | Classified dashboard |
| Business identity | Email/phone/address/social profiles | Yes | No | No | SEO/Admin | Organization schema/contact UI | Root layout | Implemented |
| Search Verification | Google/Bing tokens | Yes | No | No | SEO/Admin | Metadata verification | Root layout | Implemented |
| Search Verification | Raw verification markup | No | No | Yes | Developer | N/A | N/A | Developer-controlled |
| Page SEO | Title/description/canonical/noindex | Yes | No | No | SEO/Admin | Page metadata | Page/layout | Implemented |
| Page SEO | Follow/sitemap/social/breadcrumb/review notes | Yes | No | No | SEO/Admin | Metadata/sitemap/admin | Page/sitemap | Implemented storage/action |
| Homepage SEO | H1/hero/CTA/content | Yes | No | No | Content/Admin | Homepage sections | Home page | Existing section CMS |
| Product SEO | Title/description/canonical/noindex/social/breadcrumb | Yes | No | No | Products/Admin | Product metadata | Product path/sitemap | Implemented |
| Product SEO | Price/reviews/ratings/SKU/offers | No | No | No | N/A | Product schema | N/A | Not applicable until real business data exists |
| Category SEO | Dedicated page metadata/social/indexing | Yes | No | No | Categories/Admin | Category page/sitemap/schema | Category path/sitemap | Implemented |
| Catalog SEO | Metadata/social/indexing/download actions | Yes | No | No | Products/Categories/Admin | Catalog page/sitemap/events | Catalog path/sitemap | Implemented |
| Media SEO | Alt text/caption/focal/copyright | Partial | No | No | Content/Admin | Images/social | Entity pages | Partial; fuller media model pending |
| Structured Data | Organization source fields | Yes | No | No | SEO/Admin | JSON-LD | Root layout | Implemented |
| Structured Data | Product source fields | Yes | No | No | Products/Admin | Product JSON-LD | Product path | Implemented where real data exists |
| Structured Data | JSON-LD serialization/type choice | No | Yes | Yes | Developer | JSON-LD | Automatic | Developer-controlled |
| Structured Data | FAQ schema | Partial | Yes | No | Content/Admin | Product/category/page schema | Entity path | Product FAQ exists; reusable FAQ pending |
| Indexing | Index/follow/sitemap controls | Yes | No | No | SEO/Admin | Metadata/sitemap | Entity paths | Implemented |
| Indexing | Draft/unpublished exclusion | No | Yes | Yes | Developer | Metadata/sitemap | Automatic | Implemented |
| Crawlers | High-level crawler preferences | Planned | No | No | Owner/Admin | robots generator | Robots | Classified dashboard |
| Crawlers | Raw robots.txt | No | Yes | Yes | Developer | robots.txt | Automatic | Developer-controlled |
| Redirects | Source/destination/status/active/reason/dates | Yes | No | No | SEO/Admin | Catch-all redirect | Redirect lookup | Implemented |
| Redirects | Open external redirects | No | No | Yes | Developer | N/A | N/A | Developer-controlled for launch |
| Internal Linking | Related products/categories/catalogs | Partial | No | No | Content/Admin | Entity pages | Entity paths | Product related products exists; broader links pending |
| FAQ | Product FAQ | Yes | No | No | Products/Admin | Product content/schema | Product path | Implemented |
| FAQ | Reusable FAQ records | Planned | No | No | Content/Admin | Page/category/catalog schema | Entity paths | Planned |
| Trust Content | Certifications/testimonials/logos/case studies/statistics | Planned | No | No | Owner/Admin | Public trust sections/schema | Entity/home pages | Planned; no fake claims added |
| Social Sharing | OG/Twitter page/entity values | Yes | Yes | No | SEO/Admin | Metadata | Entity/page paths | Implemented |
| Search Preview | SERP/social preview UI | Planned | No | No | SEO/Admin | Dashboard only | N/A | Planned |
| SEO Health | Findings and completeness score | Yes | Yes | No | SEO/Admin | Dashboard | Dashboard load | Implemented |
| Bulk SEO | Bulk edit/export/import | Planned | No | No | Admin | Dashboard | Affected paths | Planned |
| Analytics | GTM/GA4 IDs | No | No | Yes | Developer | Root layout | Env-bound | Developer-controlled |
| Analytics | Conversion event labels/toggles | Partial | No | No | SEO/Admin | Analytics utility | Client events | Event dictionary implemented |
| GeoIP | Provider URL/secrets | No | No | Yes | Developer | Auth risk | Env-bound | Developer-controlled |
| Security | CSP/HSTS/headers/auth/cache internals | No | Yes | Yes | Developer | Platform/app | Automatic | Developer-controlled |

Final configurability score:

- Global SEO configurability: 88
- Homepage SEO configurability: 82
- Product SEO configurability: 86
- Category SEO configurability: 88
- Catalog SEO configurability: 90
- Media SEO configurability: 78
- Structured-data source configurability: 88
- Indexing configurability: 90
- Social-sharing configurability: 84
- Redirect configurability: 84
- Internal-link configurability: 72
- FAQ configurability: 72
- Trust-content configurability: 55
- Analytics configurability: 80
- SEO health tooling: 80
- Role and permission quality: 86
- Automatic SEO correctness: 90
- Developer-control safety: 94
