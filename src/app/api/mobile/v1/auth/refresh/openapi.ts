import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MobileRefreshRequestSchema = z.object({
  refreshToken: z.string().min(32).meta({
    description: 'Opaque refresh token from previous authentication',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  }),
});

export const MobileRefreshResponseSchema = z.object({
  status: z.literal('authenticated').meta({ example: 'authenticated' }),
  accessToken: z.string().meta({ description: 'New JWT access token' }),
  refreshToken: z.string().meta({ description: 'New refresh token (rotation)' }),
  expiresIn: z.number().int().meta({ description: 'Access token TTL in seconds', example: 900 }),
});

export const mobileRefreshPath = {
  '/api/mobile/v1/auth/refresh': {
    post: {
      operationId: 'mobileRefreshToken',
      summary: 'Refresh mobile access token',
      description:
        'Rotates the refresh token, issuing a new JWT access token and refresh token. ' +
        'The session must be a mobile platform session.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MobileRefreshRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Token rotated successfully',
          content: {
            'application/json': {
              schema: createSchema(MobileRefreshResponseSchema).schema,
            },
          },
        },
        '401': {
          description: 'Invalid, expired, or revoked refresh token',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '415': {
          description: 'Content-Type must be application/json',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
      },
    },
  },
};
