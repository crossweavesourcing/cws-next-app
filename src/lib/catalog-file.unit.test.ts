import { describe, expect, it } from 'vitest';
import { formatFileSize, validateCatalogPdfFile } from './catalog-file';

describe('catalog PDF file validation', () => {
  it('requires a selected file', () => {
    expect(validateCatalogPdfFile(null)).toEqual(expect.objectContaining({ valid: false, code: 'FILE_REQUIRED' }));
  });

  it('rejects empty and oversized files', () => {
    expect(validateCatalogPdfFile(new File([], 'empty.pdf', { type: 'application/pdf' }))).toEqual(expect.objectContaining({ valid: false, code: 'FILE_EMPTY' }));
    expect(validateCatalogPdfFile(new File(['1234'], 'large.pdf', { type: 'application/pdf' }), 3)).toEqual(expect.objectContaining({ valid: false, code: 'FILE_TOO_LARGE' }));
  });

  it('accepts the PDF MIME type and extension fallback when MIME is absent', () => {
    expect(validateCatalogPdfFile(new File(['pdf'], 'catalog.bin', { type: 'application/pdf' })).valid).toBe(true);
    expect(validateCatalogPdfFile(new File(['pdf'], 'catalog.PDF', { type: '' })).valid).toBe(true);
  });

  it('rejects non-PDF files', () => {
    expect(validateCatalogPdfFile(new File(['image'], 'catalog.png', { type: 'image/png' }))).toEqual(expect.objectContaining({ valid: false, code: 'FILE_NOT_PDF' }));
    expect(validateCatalogPdfFile(new File(['text'], 'catalog.pdf', { type: 'text/plain' }))).toEqual(expect.objectContaining({ valid: false, code: 'FILE_NOT_PDF' }));
  });

  it('formats file sizes for the selected-file panel', () => {
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});
