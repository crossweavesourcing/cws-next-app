export const DEFAULT_CATALOG_PDF_MAX_BYTES = 25 * 1024 * 1024;

export type CatalogFileValidationCode =
  | 'FILE_REQUIRED'
  | 'FILE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'FILE_NOT_PDF';

export type CatalogFileValidation =
  | { valid: true }
  | { valid: false; code: CatalogFileValidationCode; error: string };

export function validateCatalogPdfFile(
  file: File | null,
  maxBytes = DEFAULT_CATALOG_PDF_MAX_BYTES,
): CatalogFileValidation {
  if (!file) return { valid: false, code: 'FILE_REQUIRED', error: 'Choose a PDF file.' };
  if (file.size <= 0) return { valid: false, code: 'FILE_EMPTY', error: 'The selected PDF is empty.' };
  if (file.size > maxBytes) {
    return { valid: false, code: 'FILE_TOO_LARGE', error: `The PDF exceeds the ${formatFileSize(maxBytes)} limit.` };
  }

  const hasPdfMime = file.type.toLowerCase() === 'application/pdf';
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  if (!hasPdfMime && !(file.type === '' && hasPdfExtension)) {
    return { valid: false, code: 'FILE_NOT_PDF', error: 'Choose a valid PDF file.' };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}
