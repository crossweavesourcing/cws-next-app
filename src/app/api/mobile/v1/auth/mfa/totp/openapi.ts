import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MfaTotpRequestSchema = z.object({
  challengeToken: z.string().min(1).meta({
    description: 'Challenge token from login response',
    example: 'eyJhbGciOiJIUzI1NiJ9...',
  }),
  code: z.string().length(6).regex(/^\d{6}$/).meta({
    description: '6-digit TOTP code from authenticator app',
    example: '482916',
  }),
});

export const mobileMfaTotpPath = {
  '/api/mobile/v1/auth/mfa/totp': {
    post: {
      operationId: 'mobileMfaTotpVerify',
      summary: 'Verify TOTP MFA code',
      description:
        'Completes TOTP-based MFA verification using the challenge token and 6-digit code. ' +
        'Returns JWT tokens on success.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MfaTotpRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'MFA verification successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'authenticated' },
                  accessToken: { type: 'string', description: 'JWT access token' },
                  refreshToken: { type: 'string', description: 'Refresh token' },
                  expiresIn: { type: 'integer', example: 900 },
                },
                required: ['status', 'accessToken', 'refreshToken', 'expiresIn'],
              },
            },
          },
        },
        '401': {
          description: 'Invalid or expired verification challenge',
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
