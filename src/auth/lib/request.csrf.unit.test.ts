import { describe, it, expect, beforeEach, vi } from 'vitest';

const state = vi.hoisted(() => ({
  headers: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => state.headers.get(name.toLowerCase()) ?? null,
  }),
}));

vi.mock('../config/env', () => ({
  getEnv: () => ({ APP_URL: 'https://app.example.com' }),
}));

const { assertSameOrigin, assertSameOriginStrict, CsrfError } = await import('./request');

function setHeader(name: string, value: string) {
  state.headers.set(name.toLowerCase(), value);
}

describe('CSRF same-origin guards', () => {
  beforeEach(() => {
    state.headers.clear();
  });

  it('strict guard rejects when both Origin and Referer are missing', async () => {
    await expect(assertSameOriginStrict()).rejects.toBeInstanceOf(CsrfError);
  });

  it('server-action compatible guard still allows missing Origin and Referer', async () => {
    await expect(assertSameOrigin()).resolves.toBeUndefined();
  });

  it('strict guard accepts matching Origin', async () => {
    setHeader('origin', 'https://app.example.com');
    await expect(assertSameOriginStrict()).resolves.toBeUndefined();
  });

  it('strict guard accepts matching Referer when Origin is absent', async () => {
    setHeader('referer', 'https://app.example.com/dashboard');
    await expect(assertSameOriginStrict()).resolves.toBeUndefined();
  });

  it('strict guard rejects mismatched or null Origin', async () => {
    setHeader('origin', 'https://evil.example.com');
    await expect(assertSameOriginStrict()).rejects.toBeInstanceOf(CsrfError);

    state.headers.clear();
    setHeader('origin', 'null');
    await expect(assertSameOriginStrict()).rejects.toBeInstanceOf(CsrfError);
  });

  it('strict guard rejects a matching host on a different scheme or port', async () => {
    setHeader('origin', 'http://app.example.com');
    await expect(assertSameOriginStrict()).rejects.toBeInstanceOf(CsrfError);

    state.headers.clear();
    setHeader('referer', 'https://app.example.com:8443/dashboard');
    await expect(assertSameOriginStrict()).rejects.toBeInstanceOf(CsrfError);
  });
});
