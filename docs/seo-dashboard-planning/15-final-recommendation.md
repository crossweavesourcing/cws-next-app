# Final Decision Report

## 1. Recommended Immediately
* Build the UI for the existing `seoOverrides` fields in the Product Editor.
* Create a Global Settings singleton in the database for Brand Name, Default Social Image, and Social Links.
* Enforce Alt Text collection in all image upload flows.

## 2. Recommended Later
* Redirect Management UI and Middleware integration.
* SEO Health checking dashboard (identifying missing metadata or thin content).

## 3. Keep Automatic
* Canonical URL generation.
* Sitemap and Robots.txt generation.
* JSON-LD compilation.
* Caching and ISR behaviors.

## 4. Keep Developer-Controlled
* Next.js configuration (`next.config.ts`), Content Security Policies, and Environment variables for GTM/Analytics (to prevent tracking bleeding across staging/prod).

## 5. Requires Business Input
* Real contact information, legal entity name, and actual certifications to populate the Global Settings and structured data.

## Recommended Next Action
**Prompt for the next agent:** 
"Based on the SEO Dashboard Planning reports, design the MongoDB Mongoose schemas for the `GlobalSettings` and `Redirects` collections. Implement the Server Actions to mutate them with Zod validation, and restrict access to the Admin role. Finally, implement a middleware intercept to process active 301 redirects."
