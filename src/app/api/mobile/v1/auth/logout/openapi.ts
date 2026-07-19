import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { TAGS } from '@/lib/api/tags';

export const MobileLogoutRequestSchema = z.object({
  refreshToken: z.string().optional().meta({
    description: 'Refresh token to revoke. If omitted, returns success without revocation.',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  }),
});

export const MobileLogoutResponseSchema = z.object({
  ok: z.literal(true).meta({ example: true }),
});

export const mobileLogoutPath = {
  '/api/mobile/v1/auth/logout': {
    post: {
      operationId: 'mobileLogout',
      summary: 'Mobile logout',
      description:
        'Revokes the session associated with the provided refresh token. ' +
        'Always returns 200 with { ok: true } regardless of whether a valid token was provided.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MobileLogoutRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Logout processed (always succeeds)',
          content: {
            'application/json': {
              schema: createSchema(MobileLogoutResponseSchema).schema,
            },
          },
        },
        '415': {
          description: 'Content-Type must be application/json',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
  },
};
