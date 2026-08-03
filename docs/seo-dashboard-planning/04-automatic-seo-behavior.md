# Automatic SEO Behavior

The following technical outputs should remain fully automated by the application logic:

* **Canonical URLs**: Generated using the validated `APP_URL` environment variable + current request path.
* **Open Graph URLs**: Matches the Canonical URL.
* **Breadcrumb Hierarchy**: Derived from the product's category relations.
* **Sitemap XML**: Generated automatically in `src/app/sitemap.ts` from published active records.
* **Sitemap `lastModified`**: Drawn directly from the `updatedAt` database timestamp.
* **JSON-LD**: Serialized dynamically using typed builder functions based on the current entity data.
* **Draft Noindex**: Unpublished or draft records are automatically excluded from the sitemap and injected with `robots: noindex`.
* **Image Fallbacks**: If no social image is defined on a page, the global default social image is used.
