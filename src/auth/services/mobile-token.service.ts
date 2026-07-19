import { jwtVerify, SignJWT, exportJWK } from 'jose';
import { randomUUID, createPrivateKey, createPublicKey } from 'crypto';
import { ObjectId } from 'mongodb';
import { getMobileAuthConfig } from '../config/env';

const ALGORITHM = 'EdDSA';
const AUDIENCE = 'cws-mobile';

export interface MobileAccessClaims {
  sub: string;
  sid: string;
  typ: 'access';
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

async function importPrivateKey() {
  const config = getMobileAuthConfig();
  return createPrivateKey({ key: Buffer.from(config.privateKeyB64, 'base64'), format: 'der', type: 'pkcs8' });
}

async function importPublicKey(publicKeyB64: string) {
  return createPublicKey({ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' });
}

export async function issueMobileAccessToken(userId: ObjectId, sessionId: ObjectId): Promise<{
  token: string;
  expiresIn: number;
}> {
  const config = getMobileAuthConfig();
  const expiresIn = Math.floor(config.accessTokenTtlMs / 1000);
  const token = await new SignJWT({
    sub: userId.toHexString(),
    sid: sessionId.toHexString(),
    typ: 'access',
    jti: randomUUID(),
  })
    .setProtectedHeader({ alg: ALGORITHM, kid: config.keyId, typ: 'JWT' })
    .setIssuer(config.issuer)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(await importPrivateKey());

  return { token, expiresIn };
}

export async function verifyMobileAccessToken(token: string): Promise<MobileAccessClaims> {
  const config = getMobileAuthConfig();
  const headerPart = token.split('.')[0];
  if (!headerPart) throw new Error('Invalid mobile access token.');
  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as typeof header;
  } catch {
    throw new Error('Invalid mobile access token.');
  }
  if (header.alg !== ALGORITHM || !header.kid || !config.publicKeys[header.kid]) {
    throw new Error('Invalid mobile access token.');
  }
  const { payload } = await jwtVerify(token, await importPublicKey(config.publicKeys[header.kid]), {
    algorithms: [ALGORITHM],
    issuer: config.issuer,
    audience: AUDIENCE,
  });
  if (
    payload.typ !== 'access' ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Invalid mobile access token.');
  }
  return payload as unknown as MobileAccessClaims;
}

export async function getMobileJwks(): Promise<{ keys: Record<string, unknown>[] }> {
  const config = getMobileAuthConfig();
  const keys = await Promise.all(
    Object.entries(config.publicKeys).map(async ([kid, value]) => ({
      ...(await exportJWK(await importPublicKey(value))),
      kid,
      alg: ALGORITHM,
      use: 'sig',
    }))
  );
  return { keys };
}
