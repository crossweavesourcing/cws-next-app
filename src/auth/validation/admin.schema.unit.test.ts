import { ProductSchema } from './admin.schema';
import { describe, it, expect } from 'vitest';

describe('ProductSchema validation', () => {
  const validBase = {
    name: 'Test Product',
    slug: 'test-product',
    shortDescription: 'Short',
    overview: 'Overview',
    visible: true,
  };

  it('accepts valid base object', () => {
    const result = ProductSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects invalid faqs', () => {
    const result = ProductSchema.safeParse({
      ...validBase,
      faqs: [{ question: '' }] // Missing answer, empty question
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid faqs and seoOverrides', () => {
    const result = ProductSchema.safeParse({
      ...validBase,
      faqs: [{ question: 'Q', answer: 'A' }],
      seoOverrides: {
        title: 'Custom Title',
        noindex: true
      }
    });
    expect(result.success).toBe(true);
  });
});
