# Application Architecture & Technical Specification Document

**Application Name:** CWS Next App  
**Deployment Target:** Vercel (Edge & Serverless Network)  
**Date:** August 25, 2026  

---

## 1. Frontend Technology
* **Framework:** **Next.js 16** (App Router architecture with React Server Components and targeted Client Components).
* **UI Library:** **React 19**.
* **Styling & Design System:** **Tailwind CSS v4** combined with CSS variables for responsive, theme-consistent layouts.
* **Icons & Animation:** 
  * `lucide-react` for iconography.
  * `motion` (Framer Motion) for UI micro-interactions and transitions.
* **Markdown Rendering:** `react-markdown` with `sanitize-html` for dynamic CMS content rendering.
* **Validation:** `zod` for type-safe form and client-side payload validation.

---

## 2. Backend Technology
* **Runtime & Architecture:** **Node.js** running on **Vercel Serverless Functions**.
* **Backend Paradigms:** 
  * **Server Actions:** For secure, direct web-admin dashboard mutations and form handling.
  * **Route Handlers (`/api/*`):** RESTful endpoints for mobile clients, third-party integrations, and webhooks.
* **Language:** Strict **TypeScript 5**.
* **Security & Cryptography:** 
  * `argon2` (memory-hard password hashing).
  * `jose` (JWT signing and verification for mobile auth).
  * `otplib` (TOTP 2FA code generation and verification).
  * `@simplewebauthn` (WebAuthn / Passkeys server verification).
* **Media & External Services:** 
  * Cloudinary SDK (`cloudinary`) for cloud-hosted asset management and responsive image delivery.
  * Google GenAI SDK (`@google/genai`) for integrated AI capabilities.

---

## 3. Which Database?
* **Database Engine:** **MongoDB** (compatible with MongoDB Atlas M0/M10+ clusters).
* **Driver / Client:** Official native `mongodb` Node.js driver (v6).
* **Architecture:**
  * Singleton database client with connection pooling optimized for serverless lifecycles.
  * Strongly typed repositories and collection wrappers (`src/database/`).
  * Automated migration and indexing scripts for collections (`products`, `categories`, `catalogs`, `users`, `sessions`, `page_content`, etc.).

---

## 4. Admin Panel?
* **Type:** **Custom Built-in Web Admin Dashboard** (accessible at `/dashboard/`).
* **Key Features:**
  * **CMS Management:** Full CRUD over Products, Categories, Catalogs, Page Sections, Banners, Navigation, and Media.
  * **User & Role Management:** Role-Based Access Control (Admin and Editor roles).
  * **Security Management:** Active multi-device session tracking with one-click remote revocation, 2FA enforcement, and security audit logs.
  * **Dual Client Domain:** Designed to serve both the web admin interface and the mobile admin application from a unified backend.

---

## 5. SSL (Which SSL Provider?)
* **Provider:** **Vercel Automated SSL (Let's Encrypt / DigiCert)**.
* **Features:**
  * Automatic zero-configuration certificate provisioning and auto-renewal for custom domains.
  * Global CDN edge termination with HTTP/2 and modern HTTP/3 support.
  * Automatic HTTP to HTTPS redirection and configurable HSTS headers.

---

## 6. Payment Integration?
* **Current Status:** **None / Not Integrated**.
* **Rationale:** The application operates as a B2B product showcase, manufacturing sourcing, and catalog quotation platform. Direct consumer card checkout is not enabled.
* **Extensibility:** Standard payment gateways (e.g., Stripe, Lemon Squeezy, PayPal, SSLCommerz) can be added via dedicated Next.js Route Handlers and webhook listeners if e-commerce checkout is required.

---

## 7. CMS (Is Any CMS Being Used?)
* **Type:** **Custom In-House Headless CMS** directly integrated into the application codebase.
* **Managed Modules:**
  * **Product Catalog:** Products, categories, SKU attributes, image galleries, and pricing visibility rules.
  * **Catalog & PDF Scenes:** Interactive digital catalogs with PDF scene extraction.
  * **Dynamic Page Sections:** Hero banners, company values, services, FAQ accordions, and rich-text/markdown content blocks.
  * **Navigation & Menus:** Header navigation, footer links, and page visibility toggles.
  * **SEO Metadata:** Page-by-page meta titles, meta descriptions, OpenGraph social cards, canonical URLs, and dynamic sitemaps (`/sitemap.xml`).

---

## 8. Which API?
* **Architecture:** **RESTful Next.js Route Handlers** organized under `/api/*`.
* **API Specification & Docs:** Standardized using **OpenAPI 3.1** via `zod-openapi`, testable and interactive at `/api-docs` using `@scalar/nextjs-api-reference`.
* **Primary Endpoints:**
  * `/api/auth/*` — WebAuthn registration/authentication, TOTP 2FA, session lifecycle.
  * `/api/mobile/*` — Mobile administrative API with Bearer token authentication.
  * `/api/catalog/*` — Catalog feed and digital document extraction.
  * `/api/contact` — Lead submission endpoint.
  * `/api/health` — System and database connectivity health probe.

---

## 9. Authentication?
* **Web Admin Authentication:**
  * Secure, HttpOnly, SameSite, partitioned session cookies.
  * Anti-CSRF token verification and Origin header validation.
  * Device IP and User-Agent fingerprinting to prevent session hijacking.
* **Mobile App Authentication:**
  * Bearer access tokens with short TTL and automated refresh token rotation.
* **Multi-Factor Authentication (MFA/2FA):**
  * **TOTP:** Authenticator apps (Google Authenticator, Authy, 1Password) via QR code setup.
  * **Passkeys / FIDO2:** Touch ID, Face ID, Windows Hello, and hardware keys via WebAuthn.
* **Password Policy:** `argon2` hashing, `zxcvbn` password strength checks, and brute-force attempt rate limiting.

---

## 10. Data Backup?
* **Database Backups:** Managed at the database tier via **MongoDB Atlas Automated Backups** (continuous snapshots with point-in-time recovery).
* **Media & File Backups:** All uploaded media files, product images, and documents are stored redundantly on **Cloudinary CDN** with versioning.
* **Source Code & Infrastructure:** Version controlled on **GitHub** with automated deployment pipelines on Vercel.

---

## 11. Contact Form?
* **Endpoint:** Custom Next.js Route Handler (`/api/contact`).
* **Spam & Abuse Protection:**
  * **Honeypot Field:** Transparent traps for automated bots.
  * **In-Memory Idempotency Cache:** Prevents duplicate form submissions on repeated clicks.
  * **Rate Limiting:** IP-based throttling (maximum 5 requests per 15-minute window).
  * **Input Sanitization:** HTML tag stripping and length/regex validation via backend checks.
* **Destination:** Dispatches clean structured inquiries to external webhooks / Google Apps Script (saving directly to Google Sheets / sending staff email alerts) with automated timeout fallbacks.

---

## 12. Scalability (CRUD Operations)
* **Serverless Compute (Vercel):** 
  * Automatically scales execution instances horizontally based on traffic spikes without server management.
  * Fast cold starts and global edge caching for public assets.
* **Database Scalability (MongoDB Atlas):**
  * Supports horizontal sharding, replica set read distribution, and auto-scaling compute/storage tiers.
* **High-Throughput CRUD Architecture:**
  * **Connection Pooling:** Shared database connection pool across serverless function lifecycles.
  * **Smart Caching & ISR:** Public reads are cached via Next.js Incremental Static Regeneration (ISR) and CDN caching; writes instantly purge stale cache with targeted `revalidatePath` and `revalidateTag` calls.
  * **Database Indexing:** Indexed queries on slugs, category IDs, user IDs, and creation dates to maintain low latency during heavy CRUD operations.
