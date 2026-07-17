/**
 * Untrusted client-IP sentinel.
 *
 * `getClientIp()` returns this value when it cannot resolve a *trustworthy*
 * client IP (production without a configured trusted-proxy header and no
 * edge-set `x-real-ip`). It is a constant, so it must NEVER be used as a
 * rate-limit bucket key: doing so collapses every request into one global
 * bucket (see FIX — trusted-proxy IP / rate-limit DoS). Consumers that key on
 * IP (e.g. RateLimitService) must treat this value as "unknown" and skip the
 * IP dimension, relying on per-identifier + lockout checks instead.
 *
 * It is also inherently non-spoofable: because it is only produced when no
 * trusted source exists, a client can never cause a *different* client to be
 * bucketed under it.
 */
export const UNTRUSTED_IP_SENTINEL = '0.0.0.0';
