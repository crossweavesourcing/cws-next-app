# Implementation Prompt 18 — Add Security Headers (CSP, frame-ancestors, nosniff, COOP)

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. The dashboard has high-value admin actions (global logout, revoke all sessions). A security-headers review found no explicit CSP / `X-Frame-Options` / `X-Content-Type-Options` / `Cross-Origin-Opener-Policy` in the reviewed auth code. Clickjacking / MIME-sniffing on admin pages is a real vector.

Next.js sets security headers via `next.config.ts` `async headers()` (applies to all matched routes). The project root has `next.config.ts`. There is also `src/middleware.ts` (auth gate) which could add headers but `next.config.ts` is the conventional, reliable place and avoids per-request overhead.

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS). Limited fixed users.

## Goal

Add a strict, internal-app-appropriate set of HTTP security headers via `next.config.ts`. Keep them permissive enough for the app's own assets (same-origin) but block framing and sniffing.

## Implementation

In `next.config.ts`, add an `async headers()` returning a matcher for `/dashboard/:path*` (and optionally `/api/:path*` for API):
```ts
headers: async () => [
  {
    source: '/dashboard/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  },
],
```

Adjust `script-src`/`style-src` if the app uses Next.js inline scripts or a styling lib that requires `'unsafe-inline'` (Next.js App Router typically hashes/nonces scripts; verify in dev/build). If `'unsafe-inline'` is truly required for styles, restrict to `style-src 'self' 'unsafe-inline'` only and keep `script-src 'self'`.

## Acceptance criteria

1. `next.config.ts` defines security headers for dashboard (and API if desired).
2. `X-Frame-Options: DENY` and `frame-ancestors 'none'` present → admin page cannot be framed (clickjacking mitigated).
3. `X-Content-Type-Options: nosniff` present.
4. App still loads correctly in dev and prod (no broken assets due to CSP) — verify by building/running.
5. No Redis; config-only change.

## Notes

- Do NOT disable the existing auth `middleware.ts` logic.
- HSTS should be set at the edge/platform (Vercel/Netlify) since the app is serverless; note it in a comment rather than relying on the app.
- Keep `'unsafe-inline'` to an absolute minimum; prefer nonce/hash if the framework supports it.
