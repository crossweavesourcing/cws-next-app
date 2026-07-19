import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const RefreshSuccessResponseSchema = z.object({
  ok: z.literal(true).meta({ example: true }),
});

export const refreshPath = {
  '/api/auth/refresh': {
    post: {
      operationId: 'refreshSession',
      summary: 'Rotate refresh token',
      description:
        'Rotates the refresh token, issuing a new session cookie and refresh cookie. ' +
        'On reuse detection, revokes the entire session family and clears cookies. ' +
        'Protected by CSRF (Origin/Referer check). The refresh token is read from the cws_refresh cookie.',
      tags: [TAGS.AUTH],
      security: [{ cookieAuth: [] }],
      responses: {
        '200': {
          description: 'Token rotated successfully — new cookies set',
          content: {
            'application/json': {
              schema: createSchema(RefreshSuccessResponseSchema).schema,
            },
          },
        },
        '401': {
          description: 'No refresh token, token expired, or token revoked/reused',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '403': {
          description: 'CSRF validation failed',
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
