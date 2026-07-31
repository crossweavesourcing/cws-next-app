import { getDocument, OPS, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { CatalogScene, CatalogSceneOperation, CatalogScenePage, CatalogSceneText, CatalogTextRole } from '@/types/catalog';
import { generateSemanticCatalogMarkdown, getPdfLimits, isSafeCatalogLink, validateCatalogScene } from '@/lib/catalog-documents';
import { CatalogOperationError } from '@/lib/catalog-errors';

const MAX_TEXT_RUNS_PER_PAGE = 20_000;
const MAX_OPERATIONS_PER_PAGE = 50_000;
const MAX_STRING_LENGTH = 4_000;
const MAX_SANITIZE_DEPTH = 5;

const retainedOperatorNames = new Set([
  'transform', 'setTransform', 'save', 'restore',
  'setFillRGBColor', 'setStrokeRGBColor', 'setFillGray', 'setStrokeGray',
  'setFillCMYKColor', 'setStrokeCMYKColor', 'setLineWidth', 'setGState',
  'constructPath', 'stroke', 'fill', 'eoFill', 'fillStroke', 'eoFillStroke',
  'paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject',
  'paintSolidColorImageMask', 'paintFormXObjectBegin', 'paintFormXObjectEnd',
]);

const operatorNames = new Map<number, string>(
  Object.entries(OPS).filter((entry): entry is [string, number] => typeof entry[1] === 'number').map(([name, value]) => [value, name]),
);

type GraphicsState = {
  transform: [number, number, number, number, number, number];
  fillColor: number[];
  strokeColor: number[];
  lineWidth: number;
  opacity: number;
};

function multiply(left: GraphicsState['transform'], right: number[]): GraphicsState['transform'] {
  if (right.length < 6) return left;
  const [a, b, c, d, e, f] = right.map((value) => finite(value));
  return [left[0] * a + left[2] * b, left[1] * a + left[3] * b, left[0] * c + left[2] * d, left[1] * c + left[3] * d, left[0] * e + left[2] * f + left[4], left[1] * e + left[3] * f + left[5]];
}

function numericArgs(value: unknown): number[] {
  return Array.isArray(value) ? value.flat(2).filter((item): item is number => typeof item === 'number' && Number.isFinite(item)).slice(0, 8) : [];
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH || value == null || typeof value === 'boolean') return value ?? null;
  if (typeof value === 'number') return finite(value);
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => sanitize(item, depth + 1));
  if (ArrayBuffer.isView(value)) return Array.from(new Uint8Array(value.buffer, value.byteOffset, Math.min(value.byteLength, 2_000)));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) result[key.slice(0, 100)] = sanitize(item, depth + 1);
    return result;
  }
  return null;
}

function inferRole(item: { fontSize: number; y: number; height: number }, median: number, pageHeight: number): CatalogTextRole {
  if (item.y > pageHeight * 0.94) return 'header';
  if (item.y + item.height < pageHeight * 0.06) return 'footer';
  if (item.fontSize >= median * 1.7) return 'title';
  if (item.fontSize >= median * 1.25) return 'heading';
  if (item.fontSize <= median * 0.82) return 'caption';
  return 'paragraph';
}

function timeoutGuard(startedAt: number): void {
  if (Date.now() - startedAt > getPdfLimits().parseTimeoutMs) throw new CatalogOperationError('PROCESSING_FAILED', 'The PDF took too long to process.');
}

async function withinDeadline<T>(promise: Promise<T>, startedAt: number): Promise<T> {
  const remaining = getPdfLimits().parseTimeoutMs - (Date.now() - startedAt);
  if (remaining <= 0) throw new CatalogOperationError('PROCESSING_FAILED', 'The PDF took too long to process.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CatalogOperationError('PROCESSING_FAILED', 'The PDF took too long to process.')), remaining); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

async function parsePage(document: PDFDocumentProxy, pageNumber: number, startedAt: number): Promise<CatalogScenePage> {
  timeoutGuard(startedAt);
  const page = await withinDeadline(document.getPage(pageNumber), startedAt);
  const viewport = page.getViewport({ scale: 1 });
  const [textContent, operatorList, annotations, structure] = await withinDeadline(Promise.all([
    page.getTextContent({ disableNormalization: false }),
    page.getOperatorList(),
    page.getAnnotations({ intent: 'display' }),
    page.getStructTree().catch(() => null),
  ]), startedAt);
  if (textContent.items.length > MAX_TEXT_RUNS_PER_PAGE || operatorList.fnArray.length > MAX_OPERATIONS_PER_PAGE) {
    throw new CatalogOperationError('PROCESSING_FAILED', 'The PDF page is too complex to process safely.');
  }

  const rawText = textContent.items.flatMap((item) => {
    if (!('str' in item) || !item.str.trim()) return [];
    const transform = item.transform.map((value) => finite(value)) as [number, number, number, number, number, number];
    const fontSize = Math.max(1, Math.hypot(transform[2], transform[3]));
    return [{ item, transform, fontSize }];
  });
  const fontSizes = rawText.map((entry) => entry.fontSize).sort((a, b) => a - b);
  const median = fontSizes.length ? fontSizes[Math.floor(fontSizes.length / 2)] : 12;
  const text: CatalogSceneText[] = rawText.map(({ item, transform, fontSize }) => {
    const style = textContent.styles[item.fontName];
    const family = (style?.fontFamily || item.fontName || 'sans-serif').slice(0, 200);
    const lower = `${family} ${item.fontName}`.toLowerCase();
    return {
      content: item.str.slice(0, MAX_STRING_LENGTH), transform,
      width: Math.max(0, finite(item.width)), height: Math.max(0, finite(item.height)),
      fontName: item.fontName.slice(0, 200), fontFamily: family, fontSize,
      fontWeight: /bold|black|heavy|semibold/.test(lower) ? 700 : 400,
      italic: /italic|oblique/.test(lower), direction: item.dir.slice(0, 20), hasEol: Boolean(item.hasEOL),
      role: inferRole({ fontSize, y: transform[5], height: finite(item.height) }, median, viewport.height),
      fillColor: null,
    };
  });

  const operations: CatalogSceneOperation[] = [];
  const unsupportedOperators: Record<string, number> = {};
  let state: GraphicsState = { transform: [1, 0, 0, 1, 0, 0], fillColor: [0], strokeColor: [0], lineWidth: 1, opacity: 1 };
  const stateStack: GraphicsState[] = [];
  operatorList.fnArray.forEach((operator, order) => {
    const name = operatorNames.get(operator) ?? `operator_${operator}`;
    const rawArgs = operatorList.argsArray[order];
    const numbers = numericArgs(rawArgs);
    if (name === 'save') stateStack.push({ ...state, transform: [...state.transform], fillColor: [...state.fillColor], strokeColor: [...state.strokeColor] });
    else if (name === 'restore') state = stateStack.pop() ?? state;
    else if (name === 'transform' || name === 'setTransform') state = { ...state, transform: multiply(state.transform, numbers) };
    else if (name.startsWith('setFill')) state = { ...state, fillColor: numbers };
    else if (name.startsWith('setStroke')) state = { ...state, strokeColor: numbers };
    else if (name === 'setLineWidth' && numbers.length) state = { ...state, lineWidth: numbers[0] };
    else if (name === 'setGState' && numbers.length) state = { ...state, opacity: Math.max(0, Math.min(1, numbers.at(-1) ?? state.opacity)) };
    if (retainedOperatorNames.has(name)) {
      const sanitized = sanitize(rawArgs);
      operations.push({ name, args: Array.isArray(sanitized) ? sanitized : [], order, transform: [...state.transform], fillColor: [...state.fillColor], strokeColor: [...state.strokeColor], lineWidth: state.lineWidth, opacity: state.opacity });
    }
    else unsupportedOperators[name] = (unsupportedOperators[name] ?? 0) + 1;
  });

  const links = annotations.flatMap((annotation) => {
    const candidate = typeof annotation.url === 'string' ? annotation.url : typeof annotation.unsafeUrl === 'string' ? annotation.unsafeUrl : '';
    if (!candidate || !isSafeCatalogLink(candidate) || !Array.isArray(annotation.rect) || annotation.rect.length !== 4) return [];
    return [{ rect: annotation.rect.map((value: unknown) => finite(value)) as [number, number, number, number], url: candidate.slice(0, 2_000) }];
  });

  return {
    pageNumber, width: viewport.width, height: viewport.height, rotation: page.rotate,
    text, links, operations, structure: sanitize(structure), unsupportedOperators,
  };
}

export async function parseCatalogPdf(buffer: Uint8Array): Promise<{ scene: CatalogScene; markdown: string }> {
  const limits = getPdfLimits();
  if (buffer.byteLength < 5 || buffer.byteLength > limits.maxBytes || new TextDecoder().decode(buffer.subarray(0, 5)) !== '%PDF-') {
    throw new CatalogOperationError('PDF_INVALID', 'The uploaded file is not a valid PDF.');
  }
  const startedAt = Date.now();
  const task = getDocument({ data: buffer, useSystemFonts: true, stopAtErrors: false });
  try {
    const document = await withinDeadline(task.promise, startedAt);
    if (document.numPages < 1 || document.numPages > limits.maxPages) throw new CatalogOperationError('PDF_INVALID', 'The PDF is invalid or exceeds the configured limits.');
    const pages: CatalogScenePage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) pages.push(await parsePage(document, pageNumber, startedAt));
    const scene: CatalogScene = { version: 1, pages };
    validateCatalogScene(scene, document.numPages);
    return { scene, markdown: generateSemanticCatalogMarkdown(scene) };
  } catch (error) {
    if (error instanceof CatalogOperationError) throw error;
    console.error(JSON.stringify({
      level: 'error',
      event: 'catalog.pdf.parse.failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown PDF parser error',
    }));
    throw new CatalogOperationError('PDF_INVALID', 'The uploaded file could not be parsed as a valid PDF.', { cause: error });
  } finally {
    await task.destroy().catch(() => undefined);
  }
}
