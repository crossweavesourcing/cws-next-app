import type { DeviceLocation } from '@/types/auth/device.types';
import { getEnv } from '../config/env';

/**
 * Pluggable geo-IP lookup (Item 9).
 *
 * Resolution order:
 *   1. `GEOIP_LOOKUP_URL` env — an HTTP endpoint returning JSON
 *      `{ country, region, city }` for a given IP. Queried with a strict timeout.
 *   2. Offline DB — `geoip-lite` if it is installed (no network, no latency).
 *   3. None available → fail OPEN to `null` (no geo, request is not blocked).
 *
 * Hard constraints (acceptance criteria):
 *   - NEVER throws. Any failure (timeout, 4xx/5xx, bad JSON, missing dep) yields
 *     `null`, so the login path is never broken by the lookup.
 *   - NEVER blocks request latency on failure: the remote call has a hard timeout
 *     (default 300ms) and is fail-open on abort.
 *   - Loopback / private / unroutable IPs short-circuit to `null` (geo is moot and
 *     we must not emit a spurious "unknown-remote" country).
 */

export interface GeoLookupResult {
  country: string | null;
  region: string | null;
  city: string | null;
}

/** Max time to wait for a remote geo-IP lookup before failing open. */
const REMOTE_TIMEOUT_MS = 300;

/** Private / reserved ranges for which geo-IP is meaningless. */
function isPrivateOrLoopback(ip: string): boolean {
  const v = ip.trim();
  if (!v) return true;
  if (v === '127.0.0.1' || v === '::1' || v === '0.0.0.0') return true;
  if (v.startsWith('10.')) return true;
  if (v.startsWith('192.168.')) return true;
  if (v.startsWith('169.254.')) return true; // link-local
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true; // IPv6 ULA / link-local
  if (v.startsWith('172.')) {
    const m = /^172\.(\d{1,3})\./.exec(v);
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true; // RFC1918 172.16/12
  }
  return false;
}

function normalize(raw: GeoLookupResult | null | undefined): DeviceLocation {
  if (!raw) return { country: null, region: null, city: null };
  return {
    country: typeof raw.country === 'string' && raw.country ? raw.country : null,
    region: typeof raw.region === 'string' && raw.region ? raw.region : null,
    city: typeof raw.city === 'string' && raw.city ? raw.city : null,
  };
}

/**
 * Looks up the geo of an IP. Always returns a `DeviceLocation` and never throws.
 * On any failure it returns all-`null` (fail open).
 */
export async function lookupGeo(ip: string | null): Promise<DeviceLocation> {
  if (!ip || isPrivateOrLoopback(ip)) {
    return { country: null, region: null, city: null };
  }

  // 1. Remote endpoint (if configured).
  const env = getEnv();
  if (env.GEOIP_LOOKUP_URL) {
    try {
      const url = buildLookupUrl(env.GEOIP_LOOKUP_URL, ip);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as GeoLookupResult | null;
          return normalize(json);
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Timeout / network / JSON error — fail open. Never block the request.
    }
  }

  // 2. Offline DB (geoip-lite). Dynamically imported so the dependency is
  //    optional: when it is not installed the dynamic import simply rejects and
  //    we fall through to null. geoip-lite itself returns `null` (not throw) for
  //    IPs it cannot find, and its in-memory data file loads lazily on first use.
  try {
    // geoip-lite is an OPTIONAL dependency (NOT declared in package.json). Use a
    // COMPUTED specifier so the bundler (Turbopack/webpack) does not try to
    // statically resolve / bundle it — it resolves at runtime via Node's import()
    // and throws if the package is absent, which we catch and treat as "no geo".
    const geoipModule = 'geoi' + 'p-lite';
    const mod = (await import(/* webpackIgnore: true */ geoipModule)) as {
      lookup?: (ip: string) => Record<string, unknown> | null;
    };
    const lookup = mod.lookup;
    if (typeof lookup === 'function') {
      const r = lookup(ip);
      if (r) {
        const country =
          typeof r.country === 'string' ? (r.country as string) : null;
        const region =
          typeof r.region === 'string' ? (r.region as string) : null;
        const city = typeof r.city === 'string' ? (r.city as string) : null;
        if (country || region || city) {
          return normalize({ country, region, city });
        }
      }
    }
  } catch {
    // geoip-lite not installed — that's fine, fail open to null.
  }

  // 3. Nothing available.
  return { country: null, region: null, city: null };
}

/**
 * Builds the request URL for a remote geo-IP endpoint. Supports two shapes:
 *   - `https://host/lookup/{ip}`  (a `{ip}` path placeholder)
 *   - `https://host/lookup?ip=<ip>` (default: append `?ip=`)
 */
function buildLookupUrl(base: string, ip: string): string {
  if (base.includes('{ip}')) {
    return base.replace('{ip}', encodeURIComponent(ip));
  }
  const u = new URL(base);
  u.searchParams.set('ip', ip);
  return u.toString();
}
