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

const securityHeaders: Array<{ key: string; value: string }> = [
  // Prevent the admin portal from being embedded in attacker frames (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer leakage to same-origin.
  { key: 'Referrer-Policy', value: 'same-origin' },
  // Disable powerful features the CMS does not need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
  },
  // Enforce HTTPS and prevent SSL-stripping on every subsequent visit.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Hardening transport + cross-origin isolation.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // NOTE: Content-Security-Policy is now generated PER-REQUEST with a fresh nonce
  // in src/proxy.ts (the renamed middleware) so that 'unsafe-inline' can be
  // removed for script-src/style-src. A static CSP here would combine with the
  // nonce CSP and re-allow inline scripts, defeating the control.
];

const nextConfig: NextConfig = {
  // output: "export", // Commented out to allow `next start`
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.0.247'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
