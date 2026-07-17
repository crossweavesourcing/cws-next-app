import { headers } from 'next/headers';
import { getEnv } from '../config/env';
import { UNTRUSTED_IP_SENTINEL } from './ip';

/**
 * Resolves the client IP — the single source of truth used by login, OAuth
 * callback, 2FA, and refresh for rate limiting / audit / geo logic.
 *
 * Strategy (FIX-09 / FIX-C4):
 *  1. If a trusted-proxy header is configured via env (e.g. Vercel's
 *     `x-vercel-proxied-for`), prefer it — these are set by the platform edge
 *     and cannot be client-supplied.
 *  2. When NO trusted-proxy header is configured:
 *     - In PRODUCTION, client-supplied `x-forwarded-for` is fully spoofable, so
 *       we must NOT trust it. Prefer `x-real-ip` (also edge-set by most
 *       platforms) and otherwise fall back to an untrusted `0.0.0.0` sentinel.
 *       Fail-closed: collapsing per-IP limits is safer than trusting a forged
 *       header (the per-identifier/email limit still protects accounts).
 *     - In DEVELOPMENT (no real proxy) the first hop of `x-forwarded-for` is
 *       acceptable so local tooling keeps working.
 *  3. Fall back to `x-real-ip`, then `127.0.0.1` (dev/local) / `0.0.0.0` (prod
 *     untrusted sentinel).
 */
let untrustedIpWarned = false;

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const env = getEnv();

  const trustedHeader = env.TRUSTED_PROXY_IP_HEADER?.trim();
  if (trustedHeader) {
    const value = headersList.get(trustedHeader);
    if (value) return value.split(',')[0].trim();
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // No trusted-proxy header in production: client-supplied XFF is spoofable.
    // Do NOT trust it. Prefer x-real-ip (edge-set) and never a client header.
    if (!untrustedIpWarned) {
      untrustedIpWarned = true;
      console.warn(
        '⚠️  SECURITY: TRUSTED_PROXY_IP_HEADER is not set in production. Client ' +
          'IP is untrusted (x-forwarded-for is client-controlled and ignored). ' +
          'Set TRUSTED_PROXY_IP_HEADER to your platform’s trusted header and strip ' +
          'inbound x-forwarded-for at the edge. IP-based rate limits/geo now use ' +
          'x-real-ip or a 0.0.0.0 sentinel.'
      );
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) return realIp.trim();
    // Untrusted sentinel; rate-limit/geo treat as "unknown". Consumers MUST NOT
    // key a counter on this constant (it would collapse into one global bucket).
    return UNTRUSTED_IP_SENTINEL;
  }

  // Development: behind no real proxy, XFF first-hop is acceptable for local testing.
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = headersList.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Thrown by `assertSameOrigin` when a cross-origin (CSRF) request is detected.
 * Server Actions / routes should catch this and surface a neutral error to the
 * client WITHOUT echoing the offending origin.
 */
export class CsrfError extends Error {
  constructor() {
    super('Cross-origin request rejected.');
    this.name = 'CsrfError';
  }
}

/**
 * Host helper: returns the `host` (hostname:port) portion of a URL string, or
 * null if the value is not a valid absolute URL.
 */
function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * CSRF/origin guard for state-changing auth routes AND Server Actions.
 *
 * Browsers send an `Origin` header on cross-origin fetches/XHR and on
 * cross-site top-level form POSTs. For same-origin requests the `Origin` may
 * be absent or `null` (e.g. some Server Action POSTs, private-network, or
 * `file:`), so when `Origin` is missing we fall back to the `Referer` header
 * and compare its host to APP_URL's host. If neither header is present we
 * allow the request — same-origin assumptions are backed by Next.js's built-in
 * Server Action protection (encrypted action IDs + POST-only enforcement).
 *
 * C1 fix: this is now uniformly applied to EVERY state-changing auth endpoint
 * (routes via direct call, Server Actions via `withCsrfGuard`).
 */
export async function assertSameOrigin(): Promise<void> {
  const env = getEnv();
  const headersList = await headers();

  const appHost = hostOf(env.APP_URL);
  if (!appHost) {
    // Misconfigured APP_URL — fail closed rather than skip the check.
    throw new CsrfError();
  }

  const origin = headersList.get('origin');
  if (origin) {
    // `null` Origin (private network / file://) is never a legit same-origin API.
    if (origin === 'null' || hostOf(origin) !== appHost) {
      throw new CsrfError();
    }
    return;
  }

  // No Origin: fall back to Referer host (common for same-origin form/Action POSTs).
  const referer = headersList.get('referer');
  const refererHost = hostOf(referer);
  if (refererHost && refererHost !== appHost) {
    throw new CsrfError();
  }
  // No Origin and no Referer → allow (same-origin by Next.js Action protections).
}

