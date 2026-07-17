import { cookies } from 'next/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { getEnv } from '../config/env';

export const SESSION_COOKIE = 'cws_session';
export const REFRESH_COOKIE = 'cws_refresh';

const SESSION_PATH = '/';
const REFRESH_PATH = '/api/auth/refresh';

/**
 * FIX-14: single source of truth for the cookie `Secure` flag.
 *
 * `SECURE_COOKIES` is the explicit, fail-closed control. When set it wins:
 *   - `'true'`  → cookies are HTTPS-only (production).
 *   - `'false'` → cookies may be sent over plain HTTP (dev / local).
 *
 * When unset, we preserve the PREVIOUS behavior by falling back to
 * `NODE_ENV === 'production'`. That keeps local dev (no var) working over
 * HTTP while still marking cookies secure in any environment that reports
 * itself as production. Crucially, `validateSecurityConfig` in env.ts refuses
 * to BOOT in production unless `SECURE_COOKIES` is explicitly `'true'`, so an
 * unset/incorrect value can never silently ship insecure cookies to prod.
 */
export function isSecureCookies(): boolean {
  return getEnv().SECURE_COOKIES ?? (process.env.NODE_ENV === 'production');
}

/**
 * Cookie `SameSite` policy (C1 hardening).
 *
 *  - `cws_session` stays **Lax** on purpose: it must ride top-level same-site
 *    navigations (the session cookie alone grants no authz — it is an opaque
 *    HMAC-signed id validated server-side), and a Lax session cookie is what
 *    lets normal page loads work without a CSRF token.
 *  - High-value tokens (`cws_refresh`, pending 2FA/step-up/pw cookies, device
 *    token) are **Strict**: they are only ever read on same-site XHR/fetch or
 *    same-site Server Action POSTs, so Strict blocks a browser from *sending*
 *    them on a cross-site top-level form POST (the Lax CSRF hole).
 *
 * This is the cookie-layer defense. It is layered with an explicit
 * `Origin`/`Referer` guard (`assertSameOrigin`) on every state-changing
 * endpoint — see `src/auth/lib/csrf.ts`.
 */

/** Options for the session cookie — Lax (kept for top-level nav UX). */
export function sessionCookieOpts(env: { APP_URL: string }, extra?: { maxAge?: number; path?: string }) {
  const secure = isSecureCookies();
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: extra?.path ?? SESSION_PATH,
    ...(extra?.maxAge !== undefined ? { maxAge: extra.maxAge } : {}),
  };
}

/** Options for high-value tokens — Strict (blocks cross-site form POST sends). */
export function strictCookieOpts(env: { APP_URL: string }, extra?: { maxAge?: number; path?: string }) {
  const secure = isSecureCookies();
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: extra?.path ?? '/',
    ...(extra?.maxAge !== undefined ? { maxAge: extra.maxAge } : {}),
  };
}

/** Options used when *clearing* a cookie (expired date). Mirrors sameSite of issue. */
export function clearingCookieOpts(sameSite: 'lax' | 'strict', path: string) {
  const secure = isSecureCookies();
  return {
    httpOnly: true,
    secure,
    sameSite,
    path,
    expires: new Date(0),
  };
}

/**
 * Sets the HttpOnly access-session + refresh cookies. Cookie lifetimes are
 * ALWAYS derived from env TTLs so the browser cookie and the DB `expiresAt`
 * never desync (fixes the previously hardcoded 15m/7d in login/verify).
 *
 * C1: `cws_session` is Lax; `cws_refresh` is **Strict**.
 */
export async function setAuthCookies(params: {
  sessionCookie: string;
  refreshToken: string;
  rememberMe?: boolean;
}): Promise<void> {
  const cookieStore = await cookies();
  const env = getEnv();

  const sessionOpts = sessionCookieOpts(env, { path: SESSION_PATH });
  const refreshOpts = strictCookieOpts(env, { path: REFRESH_PATH });

  if (params.rememberMe) {
    sessionOpts.maxAge = Math.floor(env.ACCESS_SESSION_TTL_MS / 1000);
    refreshOpts.maxAge = Math.floor(env.REFRESH_TOKEN_TTL_MS / 1000);
  }

  cookieStore.set(SESSION_COOKIE, params.sessionCookie, sessionOpts);
  cookieStore.set(REFRESH_COOKIE, params.refreshToken, refreshOpts);
}

/**
 * Clears both auth cookies (logout / expiry / reuse).
 * C1: mirror the issue-time SameSite (session=Lax, refresh=Strict).
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', clearingCookieOpts('lax', SESSION_PATH));
  cookieStore.set(REFRESH_COOKIE, '', clearingCookieOpts('strict', REFRESH_PATH));
}

export type CookieStore = Awaited<ReturnType<typeof cookies>> | ReadonlyRequestCookies;

