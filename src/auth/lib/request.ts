import { headers } from 'next/headers';
import { getEnv } from '../config/env';
import { UNTRUSTED_IP_SENTINEL } from './ip';

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
    return UNTRUSTED_IP_SENTINEL;
  }

  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = headersList.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

export class CsrfError extends Error {
  constructor() {
    super('Cross-origin request rejected.');
    this.name = 'CsrfError';
  }
}

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originsMatch(candidateOrigin: string | null, appOrigin: string): boolean {
  if (!candidateOrigin) return false;
  const parsed = originOf(candidateOrigin);
  if (!parsed) return false;
  if (parsed === appOrigin) return true;

  // In development mode, allow localhost <-> 127.0.0.1 & http <-> https for local dev ONLY
  if (process.env.NODE_ENV === 'development') {
    try {
      const uReq = new URL(parsed);
      const uApp = new URL(appOrigin);
      const isLocalReq = uReq.hostname === 'localhost' || uReq.hostname === '127.0.0.1';
      const isLocalApp = uApp.hostname === 'localhost' || uApp.hostname === '127.0.0.1';
      if (isLocalReq && isLocalApp) {
        const portReq = uReq.port || (uReq.protocol === 'https:' ? '443' : '80');
        const portApp = uApp.port || (uApp.protocol === 'https:' ? '443' : '80');
        if (portReq === portApp) {
          return true;
        }
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * CSRF/origin guard for state-changing auth routes AND Server Actions.
 */
export async function assertSameOrigin(): Promise<void> {
  const env = getEnv();
  const headersList = await headers();

  const appOrigin = originOf(env.APP_URL);
  if (!appOrigin) {
    throw new CsrfError();
  }

  const origin = headersList.get('origin');
  if (origin) {
    if (origin === 'null' || !originsMatch(origin, appOrigin)) {
      throw new CsrfError();
    }
    return;
  }

  const referer = headersList.get('referer');
  if (referer && !originsMatch(referer, appOrigin)) {
    throw new CsrfError();
  }
}

/**
 * Strict same-origin guard for direct state-changing Route Handlers.
 */
export async function assertSameOriginStrict(): Promise<void> {
  const env = getEnv();
  const headersList = await headers();

  const appOrigin = originOf(env.APP_URL);
  if (!appOrigin) {
    throw new CsrfError();
  }

  const origin = headersList.get('origin');
  if (origin) {
    if (origin === 'null' || !originsMatch(origin, appOrigin)) {
      throw new CsrfError();
    }
    return;
  }

  const referer = headersList.get('referer');
  if (referer && originsMatch(referer, appOrigin)) {
    return;
  }

  throw new CsrfError();
}
