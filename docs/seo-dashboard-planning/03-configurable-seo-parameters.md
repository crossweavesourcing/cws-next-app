# Configurable SEO Parameters

## Global SEO Configurations
* **Website name**: Required, String, Owner control, triggers auto-generation of Title templates.
* **Default Meta Description**: Optional, String, Owner control.
* **Default Logo / Social Image**: Required, Media Reference, Owner control.
* **Business Identity**: Public email, phone, address, founding year. Required for LocalBusiness/Organization schemas.

## Page-Level SEO Configurations
* **SEO title**: Optional (fallback to name), String.
* **Meta description**: Optional (fallback to short description), String.
* **URL slug**: Required, String. (Automatic redirect creation upon change recommended).
* **Index/noindex**: Optional, Boolean (Default: Index).
* **Canonical override**: Optional, URL.

## Homepage Configurations
* SEO fields separate from content sections (Hero, capabilities, FAQs).
* Trust indicators and Client logos should be manageable collections.

## Product Configurations
* Basic SEO: Slug, title, description, canonical, noindex.
* Structured Data fields: SKU, Brand, Price, Availability, Rating (must map to actual application features; do not fabricate).

## Category & Catalog Configurations
* Categories need a parent-child relationship for Breadcrumbs.
* Catalogs need SEO metadata for the download gateway pages.

## Image SEO Configurations
* Alt text: Required per image.
* Caption: Optional.
* Focal point/crop: Advanced.
