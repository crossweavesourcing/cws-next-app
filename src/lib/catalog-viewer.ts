export function getAdaptivePageMetrics(pageWidth: number, pageHeight: number, containerWidth: number, devicePixelRatio: number) {
  const safePageWidth = Number.isFinite(pageWidth) && pageWidth > 0 ? pageWidth : 1;
  const safePageHeight = Number.isFinite(pageHeight) && pageHeight > 0 ? pageHeight : 1;
  const cssWidth = Math.max(1, Math.round(containerWidth));
  const scale = cssWidth / safePageWidth;
  const cssHeight = safePageHeight * scale;
  const outputScale = Math.max(1, Math.min(Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1, 2));
  return {
    cssWidth,
    cssHeight,
    scale,
    outputScale,
    pixelWidth: Math.max(1, Math.ceil(cssWidth * outputScale)),
    pixelHeight: Math.max(1, Math.ceil(cssHeight * outputScale)),
  };
}
