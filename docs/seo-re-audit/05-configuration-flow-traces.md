# 05 — Configuration Flow Traces

This document traces the exact end-to-end data flow for key configurable SEO settings, from dashboard input down to public HTML output.

---

## Trace 1: Global Brand Name & Default Title

```text
Dashboard Component:
src/app/(admin)/dashboard/(cms)/seo/_components/GlobalSettingsForm.tsx

Client Validation:
zod schema in src/auth/validation/seo.schema.ts

Server Mutation:
saveGlobalSettingsAction() in src/auth/actions/seo.actions.ts

Authorization Check:
requireRole('admin')

Database Persistence:
GlobalSettingsDocument in collection "global_settings" via src/auth/repositories/global-settings.repository.ts

Cache Invalidation:
revalidateTag('global-settings')

Public Reader:
SeoService.getGlobalSettings() in src/auth/services/seo.service.ts

Metadata Consumer:
src/app/(site)/layout.tsx & constructMetadata() in src/lib/seo/metadata.ts

Fallback:
"Cross Weave Sourcing"

Runtime Output:
<title>Cross Weave Sourcing | Export-Oriented Garments Manufacturer</title>
<meta property="og:site_name" content="Cross Weave Sourcing" />

Status:
FULLY_IMPLEMENTED
```

---

## Trace 2: Product SEO Title & Description

```text
Dashboard Component:
src/app/(admin)/dashboard/(cms)/products/_components/ProductForm.tsx

Client Validation:
Form input binding to product schema

Server Mutation:
updateProductAction() / createProductAction() in src/auth/actions/product.actions.ts

Authorization Check:
requireRole('admin')

Database Persistence:
Product.seoOverrides.title & Product.seoOverrides.description in collection "products"

Cache Invalidation:
revalidateTag('products') & revalidatePath('/products')

Public Reader:
getCachedProductBySlug(slug) in src/lib/data/cache.ts

Metadata Consumer:
generateMetadata() in src/app/(site)/products/[slug]/page.tsx

Fallback:
product.name & product.shortDescription

Runtime Output:
<title>Custom SEO Title | Cross Weave Sourcing</title>
<meta name="description" content="Custom Meta Description..." />

Status:
FULLY_IMPLEMENTED
```

---

## Trace 3: Dynamic Page SEO Overrides (`page_seo`)

```text
Dashboard Component:
src/app/(admin)/dashboard/(cms)/seo/_components/PageSeoManager.tsx

Client Validation:
SerializedPageSeoDocument handling with Zod validation

Server Mutation:
savePageSeoAction() in src/auth/actions/seo.actions.ts

Authorization Check:
requireRole('admin')

Database Persistence:
PageSeoDocument in collection "page_seo" via PageSeoRepository.save()

Cache Invalidation:
revalidateTag('page-seo') & revalidatePath(path)

Public Reader:
SeoService.getPageSeoByPath(path)

Metadata Consumer:
generateMetadata() on static public routes (e.g., src/app/(site)/page.tsx)

Fallback:
Global Settings default title & description

Runtime Output:
<title>Overridden Page Title</title>

Status:
FULLY_IMPLEMENTED
```
