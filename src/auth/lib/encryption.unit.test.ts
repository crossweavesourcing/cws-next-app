import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encryptSymmetric, decryptSymmetric } from './encryption';

describe('Symmetric Encryption (AES-256-GCM)', () => {
  const validKey = randomBytes(32).toString('hex');

  it('encrypts and decrypts a plaintext correctly', () => {
    const plaintext = 'super-secret-totp-seed-1234';
    const ciphertext = encryptSymmetric(plaintext, validKey);
    
    expect(ciphertext).toMatch(/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/);
    
    const decrypted = decryptSymmetric(ciphertext, validKey);
    expect(decrypted).toBe(plaintext);
  });

  it('throws an error if decryption key is incorrect', () => {
    const plaintext = 'test-data';
    const ciphertext = encryptSymmetric(plaintext, validKey);
    
    const wrongKey = randomBytes(32).toString('hex');
    expect(() => decryptSymmetric(ciphertext, wrongKey)).toThrow(/incorrect key/);
  });

  it('throws an error if ciphertext is tampered with (AuthTag failure)', () => {
    const plaintext = 'test-data';
    const ciphertext = encryptSymmetric(plaintext, validKey);
    
    // Tamper with the ciphertext (last part)
    const parts = ciphertext.split(':');
    // Change a hex character
    parts[3] = parts[3].replace(/[0-9a-f]/, (char) => (char === 'a' ? 'b' : 'a'));
    
    const tampered = parts.join(':');
    expect(() => decryptSymmetric(tampered, validKey)).toThrow(/incorrect key or corrupted payload/);
  });

  it('throws an error if key length is invalid', () => {
    const plaintext = 'test-data';
    const shortKey = randomBytes(16).toString('hex');
    
    expect(() => encryptSymmetric(plaintext, shortKey)).toThrow(/64-character/);
    expect(() => decryptSymmetric('v1:a:b:c', shortKey)).toThrow(/64-character/);
  });
});
