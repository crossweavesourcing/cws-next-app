# Social Sharing Verification Report

## Scope & Objective
Verify Open Graph (`og:*`) and Twitter Card (`twitter:*`) metadata across all public pages, fallback hierarchies, and image accessibility.

## Fallback Hierarchy
1. **Entity-Specific Social Override** (`seoTitle`, `seoDescription`, `ogImage`)
2. **Entity Primary Media** (Product main image / Catalog cover)
3. **Global Default SEO Image** (`SeoConfig.defaultOgImage`)
4. **Code Fallback** (`/og-default.png`)

## Tag Verification Table

| Meta Tag | Expected Content | Origin Verification | Status |
| :--- | :--- | :--- | :---: |
| `og:title` | Page Title / Entity Title | Form field or fallback | `FULLY_VERIFIED` |
| `og:description` | Meta Description | Form field or fallback | `FULLY_VERIFIED` |
| `og:image` | Absolute Image URL | Absolute URL built via `NEXT_PUBLIC_APP_URL` | `FULLY_VERIFIED` |
| `og:url` | Canonical Page URL | Absolute URL built via `NEXT_PUBLIC_APP_URL` | `FULLY_VERIFIED` |
| `og:type` | `website` / `product` | Dynamic route type | `FULLY_VERIFIED` |
| `twitter:card` | `summary_large_image` | Standard social card type | `FULLY_VERIFIED` |

## Conclusion
Social sharing metadata tags are 100% verified across fallback levels.
