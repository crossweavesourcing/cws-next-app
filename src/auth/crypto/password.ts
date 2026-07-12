import * as argon2 from 'argon2';
import { getEnv } from '@/auth/config/env';

/**
 * Hashes a plaintext password using Argon2id with recommended options.
 * Incorporates the application pepper if configured.
 */
export async function hashPassword(password: string): Promise<string> {
  const env = getEnv();
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
    secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
  });
}

/**
 * Verifies a plaintext password against a stored hash using Argon2id.
 * Safe against timing attacks.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const env = getEnv();
  try {
    return await argon2.verify(hash, password, {
      secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
    });
  } catch (err) {
    // If the hash is malformed or invalid, verify throws an error; fail gracefully
    return false;
  }
}
