# Database Model Recommendations

## 1. Global Settings Model
* **Fields**: `brandName` (string), `defaultSocialImage` (string URL), `socialLinks` (map), `verificationCodes` (map).
* **Constraints**: Singleton pattern (only one document).

## 2. Redirects Model
* **Fields**: `sourceUrl` (string), `destinationUrl` (string), `statusCode` (number: 301/302), `active` (boolean).
* **Indexes**: Unique index on `sourceUrl`.

## 3. Product SEO Extension
* Currently exists as `seoOverrides` in `products.schema.ts`. Extend with `socialImage` and `breadcrumbName`.
