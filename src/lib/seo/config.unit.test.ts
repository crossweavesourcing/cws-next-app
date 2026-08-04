import { describe, expect, it } from 'vitest';
import { assertInternalRedirectDestination, assertInternalRedirectSource, normalizeCanonicalUrl, normalizeSeoOverrides } from './config';

describe('safe SEO configuration validation', () => {
  it('normalizes public internal canonicals and trims empty override fields', () => {
    expect(normalizeCanonicalUrl('/products/example/')).toBe('/products/example');
    expect(normalizeSeoOverrides({ title: '  Example  ', description: '', noindex: true })).toEqual({
      title: 'Example',
      noindex: true,
    });
  });

  it('rejects unsafe canonical protocols and private paths', () => {
    expect(() => normalizeCanonicalUrl('javascript:alert(1)')).toThrow('HTTPS');
    expect(() => normalizeCanonicalUrl('/dashboard/seo')).toThrow('Private');
    expect(() => normalizeCanonicalUrl('https://example.com/api/private')).toThrow('private');
  });

  it('allows only internal public redirect paths', () => {
    expect(assertInternalRedirectSource('/old-page/')).toBe('/old-page');
    expect(assertInternalRedirectDestination('/new-page?utm=test')).toBe('/new-page?utm=test');
    expect(() => assertInternalRedirectDestination('https://example.com/new-page')).toThrow('internal path');
    expect(() => assertInternalRedirectDestination('/api/contact')).toThrow('Private');
  });
});
