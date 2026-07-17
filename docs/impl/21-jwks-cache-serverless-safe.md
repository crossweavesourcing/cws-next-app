# Implementation Prompt 21 — JWKS Caching + Serverless-Safe Token Verification

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Google OAuth in `src/auth/services/oauth.service.ts` (`verifyIdToken`) fetches Google's JWKS (JSON Web Key Set) to verify the OAuth ID token signature. Currently JWKS is fetched on **every** callback with no caching, introducing:
- Extra latency per login (network round-trip to Google).
- A hard dependency on Google being reachable at login time (availability risk).
- Potential rate-limit exposure if many callbacks happen (serverless scales horizontally → many fetches).

The verification path uses `state` + `nonce` + PKCE already (good). The only gap is JWKS caching + resilience.

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS) — instances are ephemeral and shared across many function invocations. In-memory caches are per-instance and short-lived (acceptable as a local optimization, NOT a correctness source). Limited fixed users.

## Goal

Cache Google JWKS by `kid`/`max-age` so repeated callbacks don't refetch, while remaining safe under serverless (cache is a local, best-effort, non-authoritative optimization; signature is always verified against fetched keys). Add graceful degradation so a transient Google outage fails safe (login surfaces a clear error, not a crash).

## Implementation

1. In `oauth.service.ts` (or a small `googleJwks` helper module), add an in-memory cache:
   ```ts
   // Local, non-authoritative. Safe to lose on cold start.
   let jwksCache: { keys: unknown[]; expiresAt: number } | null = null;
   ```
   Before fetching, if `jwksCache && jwksCache.expiresAt > Date.now()`, reuse it. After fetch, store with `expiresAt = now + (cacheMaxAgeMs from `Cache-Control: max-age` or default 3600_000)`.

2. When verifying, if the token's `kid` is not present in the cached set, **refresh** the JWKS (cache miss / key rotation) before failing — this handles Google key rotation correctly.

3. Wrap the network fetch + verification in try/catch:
   - On network/HTTP error, throw a typed `OAuthProviderUnavailableError` (or reuse an existing OAuth error) with a user-facing message like "Google sign-in is temporarily unavailable, please try again."
   - Never fall back to "accept without verification." Signature must always validate.

4. Keep the existing `nonce`/`state`/`audience`/`issuer` checks intact (do not weaken).

5. Add a test that (a) second verify within cache window does not refetch (spy on fetch), and (b) a missing `kid` triggers a refresh.

## Acceptance criteria

1. JWKS is cached per-instance for its `max-age` (default 1h); repeated callbacks within the window don't refetch.
2. Key rotation (`kid` not in cache) triggers a fresh fetch, not a rejected login.
3. A Google outage during fetch yields a clear, safe error (no crash, no accept-without-verify).
4. Signature/nonce/audience/issuer verification is unchanged and always enforced.
5. No Redis; in-memory cache is explicitly non-authoritative (safe on serverless).

## Notes

- If the project later adds a shared cache (e.g. an edge KV), this local cache is a safe fallback — do not make it the source of truth.
- Do not pin a single Google key; always validate against the current JWKS set.
