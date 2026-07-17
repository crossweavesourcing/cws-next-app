/**
 * Edge-compatible utilities for token and signature verification.
 * Next.js Edge runtime supports the standard Web Crypto API (`crypto.subtle`).
 */

/**
 * Verifies a signed session cookie value using Web Crypto API.
 * Returns the verified sessionId string, or null if verification fails.
 */
export async function verifySessionSignatureEdge(cookieValue: string, secret: string): Promise<string | null> {
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex === -1) return null;

  const sessionId = cookieValue.substring(0, dotIndex);
  const signatureBase64url = cookieValue.substring(dotIndex + 1);

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url to standard base64
    let base64 = signatureBase64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64 to binary
    const signatureBinary = atob(base64);
    const signatureBytes = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signatureBytes[i] = signatureBinary.charCodeAt(i);
    }

    const dataBytes = encoder.encode(sessionId);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      dataBytes
    );

    return isValid ? sessionId : null;
  } catch (error) {
    // Catch any decoding or crypto errors
    return null;
  }
}
