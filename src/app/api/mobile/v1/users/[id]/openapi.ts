import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ObjectIdSchema } from '@/lib/api/primitives';
import { UserProfileResponseSchema } from '@/lib/api/models/user';
import { UnauthorizedSchema, NotFoundSchema, ValidationErrorSchema } from '@/lib/api/errors';

export const UserIdParamSchema = z.object({
  id: ObjectIdSchema,
});

export const UserFieldsQuerySchema = z.object({
  fields: z
    .string()
    .optional()
    .meta({
      description:
        'Comma-separated list of fields to include in the response. ' +
        'If omitted, all fields are returned.',
      example: 'displayName,email,role',
    }),
});

export const userGetByIdPath = {
  '/api/mobile/v1/users/{id}': {
    get: {
      operationId: 'getUserById',
      summary: 'Get user by ID',
      description:
        'Retrieve a user profile by their MongoDB ObjectId. ' +
        'Requires a valid mobile bearer JWT. The requesting user must be an admin or ' +
        'be fetching their own profile.',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path' as const,
          required: true,
          description: 'The MongoDB ObjectId of the user',
          schema: createSchema(UserIdParamSchema.shape.id).schema,
          example: '507f1f77bcf86cd799439011',
        },
        {
          name: 'fields',
          in: 'query' as const,
          required: false,
          description: 'Comma-separated list of fields to include',
          schema: createSchema(UserFieldsQuerySchema.shape.fields!).schema,
          example: 'displayName,role',
        },
      ],
      responses: {
        '200': {
          description: 'User profile retrieved successfully',
          content: {
            'application/json': {
              schema: createSchema(UserProfileResponseSchema).schema,
            },
          },
        },
        '400': {
          description: 'Invalid user ID format',
          content: {
            'application/json': {
              schema: createSchema(ValidationErrorSchema).schema,
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: createSchema(UnauthorizedSchema).schema,
            },
          },
        },
        '404': {
          description: 'User not found',
          content: {
            'application/json': {
              schema: createSchema(NotFoundSchema).schema,
            },
          },
        },
      },
    },
  },
};
