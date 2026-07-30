import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MobileGoogleRequestSchema = z.object({
  idToken: z.string().min(1).meta({
    description: 'Google ID token from Google Sign-In SDK',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
});

export const mobileGooglePath = {
  '/api/mobile/v1/auth/google': {
    post: {
      operationId: 'mobileGoogleLogin',
      summary: 'Mobile Google login',
      description:
        'Authenticates a user with a Google ID token for the mobile API. ' +
        'Returns JWT tokens on success, or MFA challenge if 2FA is enabled.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MobileGoogleRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful',
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
        '202': {
          description: 'MFA required — use challengeToken to complete login',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'mfa_required' },
                  challengeToken: { type: 'string', description: 'Token for completing MFA challenge' },
                  methods: { type: 'array', items: { type: 'string' }, example: ['email', 'totp'] },
                },
              },
            },
          },
        },
        '401': {
          description: 'Google sign-in failed',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '403': {
          description: 'Password change required',
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
