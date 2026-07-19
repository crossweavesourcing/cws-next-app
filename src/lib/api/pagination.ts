import * as z from 'zod/v4';

export function createPaginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      data: z.array(itemSchema).meta({ description: 'List of items' }),
      pagination: z
        .object({
          page: z.number().int().min(1).meta({ description: 'Current page number', example: 1 }),
          limit: z.number().int().min(1).max(100).meta({ description: 'Items per page', example: 20 }),
          total: z.number().int().min(0).meta({ description: 'Total number of items', example: 42 }),
          totalPages: z.number().int().min(0).meta({ description: 'Total number of pages', example: 3 }),
        })
        .meta({ description: 'Pagination metadata' }),
    })
    .meta({ id: 'PaginatedResponse' });
}

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).meta({
    description: 'Page number (1-indexed)',
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).meta({
    description: 'Items per page (max 100)',
    example: 20,
  }),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
