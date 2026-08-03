import { sanitizeRichText } from './sanitization';
import { describe, it, expect } from 'vitest';

describe('sanitizeRichText', () => {
  it('allows safe tags', () => {
    const html = '<p><b>Bold</b> and <i>italic</i></p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('removes script tags completely', () => {
    const html = '<p>Text <script>alert("xss")</script></p>';
    expect(sanitizeRichText(html)).toBe('<p>Text </p>');
  });

  it('removes javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    expect(sanitizeRichText(html)).toBe('<a>Click</a>');
  });

  it('allows http/https/mailto hrefs', () => {
    const html = '<a href="https://example.com">Link</a>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('preserves allowed attributes', () => {
    const html = '<p class="text-red-500">Red</p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('removes disallowed attributes', () => {
    const html = '<p onclick="alert(1)">Click</p>';
    expect(sanitizeRichText(html)).toBe('<p>Click</p>');
  });
});
