# Structured Data Validation

Implemented:

- Category pages generate `BreadcrumbList` and `CollectionPage`.
- Category `ItemList` is emitted only from visible products.
- Product schema continues to omit fake offers, prices, reviews, ratings, and SKUs.
- Organization and WebSite schema remain generated from global settings.
- Catalog pages continue breadcrumb schema generation.

Validation status:

- Unit tests for schema builders pass.
- Full external rich-result validation was not executed from this workspace.
