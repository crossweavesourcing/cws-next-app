# API & Validation Recommendations

## Redirects API
* **Validation**: Prevent `sourceUrl` from matching `destinationUrl` (loop prevention). Ensure paths start with `/`.
* **Sanitization**: Strip domain from internal URLs.

## Global Settings API
* **Role**: Admin only.
* **Validation**: Ensure social links are valid URLs (`z.string().url()`).

## Caching
* **Invalidation**: Updating Global Settings or Redirects must trigger a revalidation of the layout/middleware cache or use `revalidateTag`.
