import * as crypto from 'crypto';

/**
 * Generates a cryptographically secure random token (defaults to 32 bytes/64 hex chars).
 */
export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Returns a SHA-256 hash of a plaintext token for secure DB storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Signs a session ID with a secret key using HMAC-SHA256.
 * Returns the cookie value in format: <sessionId>.<base64url_signature>
 */
export function signSessionId(sessionId: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('base64url');
  return `${sessionId}.${signature}`;
}

/**
 * Verifies a signed session cookie value.
 * Uses a timing-safe comparison to prevent timing side-channel attacks.
 * Returns the verified sessionId string, or null if verification fails.
 */
export function verifySessionSignature(cookieValue: string, secret: string): string | null {
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex === -1) return null;

  const sessionId = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  return isValid ? sessionId : null;
}

/**
 * Generates a cryptographically secure opaque refresh token plus its SHA-256
 * hash. ONLY the hash is persisted (in refresh_tokens.tokenHash); the raw
 * token is returned to the client once and never stored.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  return { token, tokenHash: hashToken(token) };
}
