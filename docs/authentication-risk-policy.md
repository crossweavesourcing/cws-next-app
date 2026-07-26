# Authentication Risk Policy

This document outlines the adaptive risk detection and 2FA policy implemented in the authentication system.

## Overview
The authentication system evaluates the risk of each login attempt based on various signals (device, network, behavior) and makes a deterministic decision:
1. **allow**: Login proceeds without additional steps (or with standard steps if required by other constraints).
2. **require_2fa**: Login is paused, and the user must verify their identity using a second factor (e.g., Email, TOTP, WebAuthn).
3. **require_strong_2fa**: Login is paused, and the user must verify their identity using a strong second factor (e.g., TOTP, WebAuthn).
4. **block**: Login is rejected immediately due to critical risk.

## Risk Engine
The risk engine is composed of the following modules:
- `signals.ts`: Collects signals such as device trust, new IP, impossible travel, and anonymizing networks.
- `score.ts`: Evaluates the collected signals against a configurable policy to produce a numerical score (0-100) and a risk level (`low`, `medium`, `high`, `critical`).
- `policy.ts`: Resolves the final 2FA policy based on the risk level, explicit account restrictions, and user roles.

### Risk Signals and Weights
- Unknown Device: 10
- New Device: 20
- Unusual Country: 30
- Anonymizing Network: 40
- Malicious IP: 60
- Impossible Travel: 40

### Risk Levels
- **Low**: Score < 25
- **Medium**: 25 <= Score < 60
- **High**: 60 <= Score < 100
- **Critical**: Score >= 100

## Pending Authentication Flow
When 2FA is required, the system issues an opaque token (32-byte hex string) instead of an HMAC-signed cookie. This token is stored in a `pending_authentications` MongoDB collection with a TTL index, ensuring that pending sessions expire automatically and state transitions are securely managed.

The `PendingAuthenticationRepository` handles the lifecycle of these tokens, including decrementing available attempts for failed verifications.

## Enforcement
The risk policy is enforced centrally on the backend in the following entry points:
- `src/auth/services/login.service.ts` (Password Login)
- `src/auth/services/oauth.service.ts` (Google OAuth)

Audit logs are generated for all risk evaluations, recording the risk score, level, reasons, and the final policy decision.
