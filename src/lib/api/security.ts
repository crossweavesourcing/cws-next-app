export const SECURITY_SCHEMES = {
  cookieAuth: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: 'cws_session',
    description:
      'HMAC-signed session cookie issued by the web dashboard login flow. ' +
      'Obtained via POST /api/auth/login (Server Action) or Google OAuth callback.',
  },
  bearerAuth: {
    type: 'http' as const,
    scheme: 'bearer' as const,
    bearerFormat: 'JWT',
    description:
      'Ed25519-signed JWT issued by the mobile authentication endpoints. ' +
      'Obtained via POST /api/mobile/v1/auth/password or /api/mobile/v1/auth/google.',
  },
  pendingSession: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: 'cws_2fa_pending',
    description:
      'Short-lived HMAC-signed pending session cookie set during MFA challenge. ' +
      'Valid for 5 minutes. Used by WebAuthn and TOTP verification endpoints.',
  },
};

export type SecuritySchemeName = keyof typeof SECURITY_SCHEMES;
