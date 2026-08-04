# GeoIP Production Configuration

Status: blocked for production verification.

Current code behavior:

- `GEOIP_LOOKUP_URL` is deployment configuration, not a dashboard setting.
- Contract: `GET` endpoint, IP passed with `?ip=<ip>` or `{ip}` placeholder.
- Expected JSON response: `{ "country": "...", "region": "...", "city": "..." }`.
- Timeout: 300ms.
- Private/local IPs resolve to null.
- Logging avoids precise location values.

Build result:

- `pnpm build` passed but emitted the expected warning that `STEP_UP_ENABLED` is on while `GEOIP_LOOKUP_URL` is missing.

Launch effect:

- This prevents an unconditional `GO` from this workspace. Production must configure and verify `GEOIP_LOOKUP_URL` or document an approved high-risk fallback.
