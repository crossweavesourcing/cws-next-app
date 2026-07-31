import { describe, expect, it } from 'vitest';
import { CatalogOperationError, classifyCatalogError, toCatalogActionFailure } from './catalog-errors';

describe('catalog error classification', () => {
  it.each([
    ['STORAGE_NOT_CONFIGURED', 'Catalog storage is not configured.'],
    ['UPLOAD_SIGNING_FAILED', 'Upload signing failed.'],
    ['ASSOCIATION_NOT_FOUND', 'Category no longer exists.'],
    ['PDF_INVALID', 'Invalid PDF.'],
    ['PDF_RENDERING_UNAVAILABLE', 'Rendering unavailable.'],
  ] as const)('preserves safe operation errors for %s', (code, message) => {
    expect(classifyCatalogError(new CatalogOperationError(code, message))).toEqual({ code, message });
  });

  it('maps permission, validation, and database failures', () => {
    expect(classifyCatalogError(Object.assign(new Error('denied'), { name: 'CatalogForbiddenError' })).code).toBe('FORBIDDEN');
    expect(classifyCatalogError(Object.assign(new Error('bad input'), { name: 'ZodError' })).code).toBe('INVALID_INPUT');
    expect(classifyCatalogError(Object.assign(new Error('db detail'), { name: 'MongoNetworkError' }))).toEqual({ code: 'DATABASE_UNAVAILABLE', message: 'Catalog data is temporarily unavailable.' });
  });

  it('collapses unexpected failures to a safe processing error', () => {
    expect(classifyCatalogError(new Error('secret internal detail'))).toEqual({ code: 'PROCESSING_FAILED', message: 'The catalog operation could not be completed.' });
  });

  it('adds a diagnostic reference only to unexpected action failures', () => {
    expect(toCatalogActionFailure(new Error('internal'), 'ref-123')).toEqual(expect.objectContaining({ success: false, code: 'PROCESSING_FAILED', referenceId: 'ref-123' }));
    expect(toCatalogActionFailure(new CatalogOperationError('STORAGE_NOT_CONFIGURED', 'Storage unavailable.'), 'ref-123')).not.toHaveProperty('referenceId');
  });
});
