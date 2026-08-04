# Category SEO Decision

Decision: dedicated public category pages.

Reasoning:

- The user selected dedicated category landing pages.
- Query-filter URLs remain UX state on `/products?category=...` and are not added to the sitemap.
- Category routes support independent metadata, breadcrumbs, structured data, and product discovery without creating query-index duplicate content.

Implemented route:

- `/categories/[slug]`

Indexing rule:

- Only visible categories that are not `noindex` and not explicitly excluded from sitemap are eligible for sitemap inclusion.
