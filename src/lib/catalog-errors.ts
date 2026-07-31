export type CatalogErrorCode =
  | 'INVALID_INPUT'
  | 'FORBIDDEN'
  | 'ASSOCIATION_NOT_FOUND'
  | 'STORAGE_NOT_CONFIGURED'
  | 'UPLOAD_SIGNING_FAILED'
  | 'UPLOAD_REJECTED'
  | 'PDF_INVALID'
  | 'PDF_RENDERING_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'PROCESSING_FAILED';

export class CatalogOperationError extends Error {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CatalogOperationError';
  }
}

export type CatalogActionFailure = {
  success: false;
  code: CatalogErrorCode;
  error: string;
  referenceId?: string;
};

export function classifyCatalogError(error: unknown): { code: CatalogErrorCode; message: string } {
  if (error instanceof CatalogOperationError) return { code: error.code, message: error.message };
  if (error instanceof Error) {
    if (error.name === 'CatalogForbiddenError') return { code: 'FORBIDDEN', message: 'You do not have permission to manage this catalog.' };
    if (error.name === 'ZodError' || error.name === 'CatalogValidationError') return { code: 'INVALID_INPUT', message: error.message };
    if (error.name === 'DatabaseConfigError' || error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      return { code: 'DATABASE_UNAVAILABLE', message: 'Catalog data is temporarily unavailable.' };
    }
  }
  return { code: 'PROCESSING_FAILED', message: 'The catalog operation could not be completed.' };
}

export function toCatalogActionFailure(error: unknown, referenceId: string): CatalogActionFailure {
  const classified = classifyCatalogError(error);
  return {
    success: false,
    code: classified.code,
    error: classified.message,
    ...(classified.code === 'PROCESSING_FAILED' ? { referenceId } : {}),
  };
}
