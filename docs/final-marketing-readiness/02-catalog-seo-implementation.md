# Catalog SEO Implementation

Implemented:

- Catalog metadata updates now persist `seoOverrides`.
- Supported fields include SEO title, meta description, canonical override, noindex, nofollow, sitemap inclusion, social title, social description, social image, and breadcrumb label.
- Canonical validation accepts only safe HTTPS URLs or public internal paths and rejects private/API/dashboard/preview paths and unsafe protocols.
- Public catalog metadata consumes social/indexing overrides.
- Catalog view, download, and external-open analytics events were added.
- Sitemap excludes noindex catalogs and catalogs with `includeInSitemap=false`.

Cache behavior:

- Catalog metadata actions revalidate dashboard/product/category surfaces and catalog public paths through existing catalog revalidation helpers.
- Sitemap revalidation is requested for sitemap-relevant changes.

Limitations:

- Cover image, long catalog description, FAQ, and archive behavior are documented as configurable targets but require fuller media/FAQ/archive models before safe publication.
