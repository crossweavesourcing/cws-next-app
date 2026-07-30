import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { getEnv } from '../config/env';
import { ObjectId } from 'mongodb';
import { signSessionId } from '../crypto/token';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sessionCookieOpts, clearingCookieOpts } from './cookies';

/** Long-lived client device-identity cookie. Mirrors devices.schema deviceId (36-char UUID v4). */
export const DEVICE_COOKIE = 'cws_device';

/**
 * SECURITY BOUNDARY cookie (server-issued). Contains an HMAC-signed reference
 * to the `devices._id` record minted at first login, optionally followed by a
 * rotation nonce: `<deviceRecordId>.<HMAC>.<nonce?>`. Because the value is
 * HMAC-signed with SESSION_SECRET, a client cannot forge or choose a device id
 * — the only way to present a valid device identity is to hold a token the
 * server previously issued. Blocking therefore keys off this server record id,
 * not the client-chosen `cws_device` UUID.
 */
export const DEVICE_TOKEN_COOKIE = 'cws_device_token';
const DEVICE_TOKEN_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Holds the resolved device identity for the current request.
 * - `serverDeviceId`: the Mongo `devices._id` (verified from the signed token).
 *   This is the value that should drive authz / blocking. `null` when the
 *   client has no valid server token yet (and a fresh record will be minted).
 * - `clientDeviceId`: the legacy client-generated UUID v4 (`cws_device`), kept
 *   ONLY as a correlation hint. NEVER authorize on it.
 */
export interface DeviceIdentity {
  serverDeviceId: ObjectId | null;
  clientDeviceId: string | null;
  /** True when a valid signed server token was presented. */
  hasServerToken: boolean;
}

/**
 * Resolves the device identity for the current request, minting + persisting a
 * server device record id when none exists.
 *
 * Priority:
 *   1. A valid signed `cws_device_token` cookie → trust its devices._id.
 *   2. Otherwise mint a fresh server device record id, sign it, and set the
 *      cookie. The new record is upserted by SessionService on first login.
 *   3. The legacy client UUID (`cws_device`) is read as a correlation hint and
 *      is NEVER used as a security boundary.
 *
 * Must be called inside a Request scope (Server Component / Action / Route).
 */
export async function ensureDeviceId(): Promise<DeviceIdentity> {
  try {
    const cookieStore = await cookies();

    const clientDeviceId = readClientDeviceId(cookieStore);

    const token = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    if (token) {
      const recordId = verifyServerDeviceToken(token);
      if (recordId) {
        return { serverDeviceId: recordId, clientDeviceId, hasServerToken: true };
      }
    }

    // No valid server token → mint a fresh server device record id and issue the
    // signed cookie. The devices collection row is created lazily on first login
    // (see SessionService), keyed by this record id.
    const recordId = new ObjectId();
    const signed = signServerDeviceToken(recordId);
    cookieStore.set(DEVICE_TOKEN_COOKIE, signed, {
      ...sessionCookieOpts(getEnv(), { path: '/' }),
      maxAge: DEVICE_TOKEN_MAX_AGE,
    });

    return { serverDeviceId: recordId, clientDeviceId, hasServerToken: false };
  } catch {
    return { serverDeviceId: null, clientDeviceId: null, hasServerToken: false };
  }
}

/**
 * Reads the device identity WITHOUT minting a new token (use when a request is
 * expected to already carry a server token, e.g. an authenticated session).
 * Returns null when the client lacks a valid signed token.
 */
export async function getDeviceId(): Promise<DeviceIdentity | null> {
  try {
    const cookieStore = await cookies();
    const clientDeviceId = readClientDeviceId(cookieStore);
    const token = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    if (!token) return null;

    const recordId = verifyServerDeviceToken(token);
    if (!recordId) return null;

    return { serverDeviceId: recordId, clientDeviceId, hasServerToken: true };
  } catch {
    return null;
  }
}

/**
 * Issues (or refreshes) the signed server device token for an already-minted
 * device record id. Call this AFTER a successful login so the client persists
 * the server device id that the session is bound to. When `rotate` is set, the
 * nonce is refreshed (defense-in-depth; prior tokens for the same record remain
 * valid since verification ignores the nonce).
 *
 * Issued with SameSite=lax (per Item 4 spec): the cookie is HMAC-verified so it
 * is a server-issued security boundary; Lax keeps it attached to same-site
 * top-level navigations, and the CSRF origin guard covers state-changing calls.
 */
export async function setServerDeviceToken(
  recordId: ObjectId,
  opts: { rotate?: boolean; nonce?: string } = {}
): Promise<void> {
  try {
    const cookieStore = await cookies();
    const nonce = opts.rotate ? opts.nonce ?? randomNonce() : undefined;
    const signed = signServerDeviceToken(recordId, nonce);
    cookieStore.set(DEVICE_TOKEN_COOKIE, signed, {
      ...sessionCookieOpts(getEnv(), { path: '/' }),
      maxAge: DEVICE_TOKEN_MAX_AGE,
    });
  } catch {
    // Silent fail-open if cookies cannot be set in current context
  }
}

/** Clears the server device token (logout / device reset). */
export async function clearServerDeviceToken(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(DEVICE_TOKEN_COOKIE, '', clearingCookieOpts('lax', '/'));
  } catch {
    // Silent fail-open
  }
}

function signServerDeviceToken(recordId: ObjectId, nonce?: string): string {
  const base = recordId.toString();
  const signed = signSessionId(base, getEnv().SESSION_SECRET);
  return nonce ? `${signed}.${nonce}` : signed;
}

export function verifyServerDeviceToken(token: string): ObjectId | null {
  // Token shape: `<id>.<sig>` or `<id>.<sig>.<nonce>`. The nonce (if present)
  // is ignored for verification — only the HMAC over the id matters.
  const sigSplit = token.indexOf('.');
  if (sigSplit === -1) return null;
  const base = token.substring(0, sigSplit);

  let id: ObjectId;
  try {
    id = new ObjectId(base);
  } catch {
    return null;
  }

  const expected = signSessionId(base, getEnv().SESSION_SECRET);
  const provided = token.substring(0, expected.length);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    return null;
  }
  return id;
}

function readClientDeviceId(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): string | null {
  const value = cookieStore.get(DEVICE_COOKIE)?.value;
  return value && isValidUuidV4(value) ? value : null;
}

function randomNonce(): string {
  return randomBytes(12).toString('base64url');
}

/** Lightweight structural UUID v4 validation (no DB lookup). Correlation-only. */
export function isValidUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Derives a coarse device classification + browser/OS from the User-Agent.
 * Kept in sync with SessionService.parseUserAgent but returns DeviceType too.
 */
export async function classifyRequest(): Promise<{
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  platform: 'web' | 'mobile' | 'desktop' | null;
  browser: string | null;
  operatingSystem: string | null;
  userAgent: string | null;
}> {
  const headersList = await headers();
  const ua = headersList.get('user-agent') || null;
  if (!ua) {
    return { type: 'unknown', platform: null, browser: null, operatingSystem: null, userAgent: null };
  }
  const s = ua.toLowerCase();

  let type: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  if (/tablet|ipad/.test(s)) type = 'tablet';
  else if (/mobile|android|iphone|ipod/.test(s)) type = 'mobile';
  else if (/windows|macintosh|linux/.test(s)) type = 'desktop';

  let platform: 'web' | 'mobile' | 'desktop' | null = null;
  if (/mobile|android|iphone|ipad|ipod/.test(s)) platform = 'mobile';
  else if (/windows|macintosh|linux/.test(s)) platform = 'desktop';
  else platform = 'web';

  let browser: string | null = null;
  if (s.includes('edg')) browser = 'Edge';
  else if (s.includes('chrome')) browser = 'Chrome';
  else if (s.includes('safari')) browser = 'Safari';
  else if (s.includes('firefox')) browser = 'Firefox';

  let operatingSystem: string | null = null;
  if (s.includes('windows')) operatingSystem = 'Windows';
  else if (s.includes('mac os') || s.includes('macintosh')) operatingSystem = 'macOS';
  else if (s.includes('iphone') || s.includes('ipad')) operatingSystem = 'iOS';
  else if (s.includes('android')) operatingSystem = 'Android';
  else if (s.includes('linux')) operatingSystem = 'Linux';

  return { type, platform, browser, operatingSystem, userAgent: ua };
}
