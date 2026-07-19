import * as z from 'zod/v4';

export const ErrorSchema = z
  .object({
    error: z.string().meta({
      description: 'A human-readable error message',
      example: 'Resource not found',
    }),
  })
  .meta({ id: 'Error' });

export const ValidationErrorDetailSchema = z
  .object({
    path: z.string().meta({ description: 'Dot-separated field path', example: 'body.email' }),
    message: z.string().meta({ description: 'Validation error message', example: 'Invalid email format' }),
    code: z.string().meta({ description: 'Zod error code', example: 'invalid_format' }),
  })
  .meta({ id: 'ValidationErrorDetail' });

export const ValidationErrorSchema = z
  .object({
    error: z.literal('Validation failed').meta({ example: 'Validation failed' }),
    details: z.array(ValidationErrorDetailSchema).meta({
      description: 'List of validation failures',
    }),
  })
  .meta({ id: 'ValidationError' });

export const UnauthorizedSchema = z
  .object({
    error: z.string().meta({ description: 'Authentication required', example: 'Unauthorized' }),
  })
  .meta({ id: 'Unauthorized' });

export const ForbiddenSchema = z
  .object({
    error: z.string().meta({ description: 'Insufficient permissions', example: 'Forbidden' }),
  })
  .meta({ id: 'Forbidden' });

export const NotFoundSchema = z
  .object({
    error: z.string().meta({ description: 'Resource not found', example: 'Not found' }),
  })
  .meta({ id: 'NotFound' });

export const RateLimitSchema = z
  .object({
    error: z.string().meta({ description: 'Rate limit exceeded', example: 'Too many requests' }),
  })
  .meta({ id: 'RateLimit' });

export type ErrorResponse = z.infer<typeof ErrorSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorSchema>;
