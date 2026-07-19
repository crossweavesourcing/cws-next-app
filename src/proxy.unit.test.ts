import { describe, expect, it } from 'vitest';
import { buildCsp } from './proxy';

describe('dashboard proxy Content-Security-Policy', () => {
  it('allows React development debugging eval while retaining the nonce', () => {
    const policy = buildCsp('test-nonce', true);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'unsafe-eval'");
  });

  it('does not allow eval in production', () => {
    const policy = buildCsp('test-nonce', false);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('allows only the Google origins needed by the configured web fonts', () => {
    const policy = buildCsp('test-nonce', false);

    expect(policy).toContain('style-src');
    expect(policy).toContain('https://fonts.googleapis.com');
    expect(policy).toContain('font-src');
    expect(policy).toContain('https://fonts.gstatic.com');
    expect(policy).toContain("connect-src 'self'");
  });

  it('allows browser-local image previews without broadening script sources', () => {
    const policy = buildCsp('test-nonce', false);

    expect(policy).toContain("img-src 'self' blob: data: https:");
    expect(policy).not.toContain('script-src blob:');
  });
});
