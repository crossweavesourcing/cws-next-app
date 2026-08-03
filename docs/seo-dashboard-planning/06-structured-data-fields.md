# Structured Data Configurations

## Organization
* **Source Fields**: Company Name, Legal Name, Logo, URL, ContactPoint (Phone, Email), SameAs (Social Links).
* **Auto-generated**: `@context`, `@type`.

## WebSite
* **Source Fields**: URL, SearchAction (if site search exists).

## Product
* **Source Fields**: Name, Description, Image, SKU, Brand, Offers (Price, Currency, Availability).
* **Exclusions**: Do NOT include AggregateRating or Reviews if the system does not actually collect real user reviews. Do NOT use fake price `0`.

## BreadcrumbList
* **Source Fields**: Page names and generated relative URLs.
