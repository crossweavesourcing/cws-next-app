# Route and Content-Type Inventory

| Route or content type | Public/private | Dynamic/static | Owner editable | Indexable | SEO configuration currently available | Missing configuration |
|---|---|---|---|---|---|---|
| Homepage (`/`) | Public | Static (with sections) | Partial | Yes | None | SEO Title, Meta Desc, OG Data |
| Product listing (`/products`) | Public | Static | No | Yes | None | Global SEO overrides |
| Product details (`/products/[slug]`) | Public | Dynamic (SSG/ISR) | Yes | Yes | `seoOverrides.title`, `.description`, `.canonicalUrl`, `.noindex` | OG Image, Social title, JSON-LD fine-tuning |
| Categories (`/categories/[slug]`) | Public | Dynamic | Yes | Yes | None (Route currently not active) | Route itself, SEO fields |
| Catalogs (`/catalogs/[slug]`) | Public | Dynamic | Yes | Yes | None | SEO Title, Meta Desc, OG Image |
| Dashboard (`/dashboard`) | Private | Dynamic | No | No (via robots/middleware) | N/A | N/A |
| Authentication | Public | Dynamic | No | No | N/A | N/A |
