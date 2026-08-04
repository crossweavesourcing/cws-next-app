# 12 — Structured Data Validation

Validation of JSON-LD schemas against standard Schema.org requirements.

## 1. Organization Schema
- **Injected File**: `src/app/(site)/layout.tsx`
- **Output**:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://crossweavesourcing.com/#organization",
  "name": "Cross Weave Sourcing",
  "url": "https://crossweavesourcing.com",
  "logo": "https://crossweavesourcing.com/icon.png"
}
```
- **Validation**: 0 Errors, 0 Warnings.

## 2. WebSite Schema
- **Injected File**: `src/app/(site)/layout.tsx`
- **Output**:
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://crossweavesourcing.com/#website",
  "url": "https://crossweavesourcing.com",
  "name": "Cross Weave Sourcing"
}
```
- **Validation**: 0 Errors, 0 Warnings.

## 3. Product Schema
- **Injected File**: `src/app/(site)/products/[slug]/page.tsx`
- **Output**: Valid `Product` context with `name`, `description`, `image`, `brand`, `category`, and `manufacturer`. No fake reviews or prices are injected.
- **Validation**: 0 Errors, 0 Warnings.
