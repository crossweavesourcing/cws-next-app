import * as z from 'zod/v4';

export const ObjectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i).meta({
  description: 'MongoDB ObjectId (24 hex characters)',
  example: '507f1f77bcf86cd799439011',
});

export const IsoDateTimeSchema = z.string().datetime().meta({
  description: 'ISO 8601 date-time string',
  example: '2026-01-15T10:30:00.000Z',
});
