import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MobilePasswordLoginRequestSchema = z.object({
  email: z.string().email().max(254).meta({
    description: 'User email address',
    example: 'admin@crossweavesourcing.com',
  }),
  password: z.string().min(1).max(128).meta({
    description: 'User password',
    example: '••••••••••••',
  }),
  rememberMe: z.boolean().default(false).optional().meta({
    description: 'Extend session lifetime (default: false)',
    example: false,
  }),
});

export const MobileAuthSuccessResponseSchema = z.object({
  status: z.literal('authenticated').meta({ example: 'authenticated' }),
  accessToken: z.string().meta({ description: 'Ed25519-signed JWT access token' }),
  refreshToken: z.string().meta({ description: 'Opaque refresh token' }),
  expiresIn: z.number().int().meta({ description: 'Access token TTL in seconds', example: 900 }),
});

export const MobileMfaRequiredResponseSchema = z.object({
  status: z.literal('mfa_required').meta({ example: 'mfa_required' }),
  challengeToken: z.string().meta({ description: 'Token for completing MFA challenge' }),
  methods: z.array(z.string()).meta({
    description: 'Available MFA methods',
    example: ['email', 'totp'],
  }),
});

export const mobilePasswordPath = {
  '/api/mobile/v1/auth/password': {
    post: {
      operationId: 'mobilePasswordLogin',
      summary: 'Mobile password login',
      description:
        'Authenticates a user with email and password for the mobile API. ' +
        'Returns JWT tokens on success, or MFA challenge if 2FA is enabled. ' +
        'Returns 403 if the user must change their password.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MobilePasswordLoginRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful',
          content: {
            'application/json': {
              schema: createSchema(MobileAuthSuccessResponseSchema).schema,
            },
          },
        },
        '202': {
          description: 'MFA required — use challengeToken to complete login',
          content: {
            'application/json': {
              schema: createSchema(MobileMfaRequiredResponseSchema).schema,
            },
          },
        },
        '401': {
          description: 'Invalid credentials',
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
