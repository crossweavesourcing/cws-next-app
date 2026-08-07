# Runtime Public Route Results Report

## Scope & Objective
Audit rendered production HTML across public and administrative routes.

## Route Verification Table

| Route | HTTP Status | `<title>` | `<meta description>` | Canonical | Robots | JSON-LD | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`/` (Homepage)** | `200 OK` | Rendered | Rendered | Present | `index, follow` | Present | `FULLY_VERIFIED` |
| **`/products`** | `200 OK` | Rendered | Rendered | Present | `index, follow` | Present | `FULLY_VERIFIED` |
| **`/products/[slug]`** | `200 OK` | Rendered | Rendered | Present | `index, follow` | `Product` | `FULLY_VERIFIED` |
| **`/categories/[slug]`** | `200 OK` | Rendered | Rendered | Present | `index, follow` | `CollectionPage` | `FULLY_VERIFIED` |
| **`/catalogs/[slug]`** | `200 OK` | Rendered | Rendered | Present | `index, follow` | `DigitalDocument` | `FULLY_VERIFIED` |
| **`/legal/privacy`** | `200 OK` | Rendered | Rendered | Present | `noindex, follow` | Present | `FULLY_VERIFIED` |
| **`/dashboard`** | `302 / 200` | Rendered | N/A | N/A | `noindex, nofollow` | Excluded | `FULLY_VERIFIED` |

## Conclusion
Public routes render compliant, error-free metadata and structured data in production builds.
