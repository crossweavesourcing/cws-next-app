import type { NextConfig } from "next";

// -------------------------------------------------------------------------
// SECRETS / ENVIRONMENT VARIABLES
// This file intentionally does NOT contain any secret values. All sensitive
// variables (MONGODB_URI, SESSION_SECRET, ARGON2_SECRET, GOOGLE_CLIENT_SECRET,
// EMAIL_PASSWORD, ADMIN_SEED_PASSWORD) are injected by the deploy platform
// (Vercel/Netlify project env, Vault, AWS Secrets Manager) and read from
// process.env by src/auth/config/env.ts. For self-managed/"next start"
// deployments, set them in the host's environment (or a gitignored .env)
// before launching the server — never commit real values to a checked-in file.
// See README → "Deployment & Secrets Management". Rotate the shipped MongoDB
// credential and the blocklisted SESSION_SECRET default before any real
// deployment.
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// SECURITY HEADERS
// Applied at the framework level (next.config.ts) — the conventional, reliable
// place for static response headers (no per-request overhead). The auth gate
// itself lives in src/proxy.ts (the renamed middleware) and is NOT modified
// here; this is a config-only change.
//
// NOTE on CSP: src/proxy.ts already mints a PER-REQUEST nonce-based
// Content-Security-Policy on /dashboard routes (script-src/style-src use the
// nonce, so 'unsafe-inline' is removed — strictly stronger than a static
// policy). On /dashboard the proxy's response.headers.set(...) overwrites this
// static CSP, so the two never combine to weaken the policy. This static CSP
// therefore acts as defense-in-depth and covers routes the proxy does NOT
// match (e.g. /api), where inline scripts/styles are not expected.
//
// NOTE on HSTS: This is a serverless/edge deployment. HSTS must be set at the
// edge/platform (Vercel/Netlify custom headers / _headers) rather than in the
// app, so it is intentionally NOT applied here. Configure it there, e.g.
//   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
// -------------------------------------------------------------------------
const securityHeaders: Array<{ key: string; value: string }> = [
  // Prevent the admin portal from being embedded in attacker frames (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing of responses served with an incorrect/ambiguous type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Do not leak the referrer (URL) to cross-origin destinations.
  { key: 'Referrer-Policy', value: 'no-referrer' },
  // Isolate the browsing context from cross-origin windows.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Restrict who may load these responses cross-origin (no-FRAME/CSRF-adjacent hardening).
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // Disable powerful features the admin app does not need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // Defense-in-depth CSP. 'self' permits the app's own same-origin assets;
  // frame-ancestors 'none' blocks framing outright. On /dashboard this is
  // superseded by the nonce-based CSP in src/proxy.ts (see note above).
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https://api.cloudinary.com; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  // Ensure non-public routes matching this header block are never indexed or crawled
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const publicSecurityHeaders: Array<{ key: string; value: string }> = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // Allows Analytics to see sources
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: https: https://res.cloudinary.com; connect-src 'self' https://api.cloudinary.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/pdf.worker.min.mjs': ['./node_modules/pdfjs-dist/build/pdf.worker.min.mjs'],
  },
  // output: "export", // Commented out to allow `next start`
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.0.247'],
  async headers() {
    const isStaging = process.env.NEXT_PUBLIC_SITE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
    
    const basePublicHeaders = [...publicSecurityHeaders];
    if (isStaging) {
      basePublicHeaders.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
    }

    // Scope the strict set to the high-value admin surface (dashboard) and the
    // JSON API. Public marketing routes use the more relaxed publicSecurityHeaders.
    return [
      {
        source: '/(.*)',
        headers: basePublicHeaders,
      },
      {
        source: '/dashboard/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
