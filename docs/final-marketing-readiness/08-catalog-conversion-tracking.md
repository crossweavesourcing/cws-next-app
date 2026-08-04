# Catalog Conversion Tracking

Implemented events:

- `catalog_view`
- `catalog_download`
- `catalog_external_open`

Trigger rules:

- `catalog_view` fires after a public catalog page renders.
- `catalog_download` fires only from a deliberate download link click.
- `catalog_external_open` fires only from the explicit open-PDF link.

Allowed properties:

- Catalog slug, catalog title, page count, page path, and public context fields.

Deduplication:

- Event IDs prevent duplicate view/download/open events in the same client session.
