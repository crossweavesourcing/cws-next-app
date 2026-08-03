import { describe, expect, it } from 'vitest';
import { getAdaptivePageMetrics } from './catalog-viewer';

describe('adaptive catalog page metrics', () => {
  it('preserves the PDF aspect ratio at mobile and desktop widths', () => {
    expect(getAdaptivePageMetrics(800, 1200, 400, 1)).toMatchObject({ cssWidth: 400, cssHeight: 600, scale: 0.5 });
    expect(getAdaptivePageMetrics(800, 1200, 1200, 1)).toMatchObject({ cssWidth: 1200, cssHeight: 1800, scale: 1.5 });
  });

  it('caps bitmap density without changing CSS dimensions', () => {
    expect(getAdaptivePageMetrics(800, 600, 400, 3)).toMatchObject({ cssWidth: 400, cssHeight: 300, outputScale: 2, pixelWidth: 800, pixelHeight: 600 });
  });
});
