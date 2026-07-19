import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MfaWebAuthnVerifyRequestSchema = z.object({
  challengeToken: z.string().min(1).meta({
    description: 'Challenge token from login response',
    example: 'eyJhbGciOiJIUzI1NiJ9...',
  }),
  response: z.object({
    id: z.string().meta({ description: 'Authenticator credential ID' }),
    rawId: z.string().meta({ description: 'Raw credential ID (base64url)' }),
    response: z.object({
      authenticatorData: z.string().meta({ description: 'Authenticator data (base64url)' }),
      clientDataJSON: z.string().meta({ description: 'Client data JSON (base64url)' }),
      signature: z.string().meta({ description: 'Signature (base64url)' }),
      userHandle: z.string().optional().meta({ description: 'User handle (base64url)' }),
    }),
    type: z.literal('public-key').meta({ example: 'public-key' }),
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const mobileMfaWebauthnVerifyPath = {
  '/api/mobile/v1/auth/mfa/webauthn/verify': {
    post: {
      operationId: 'mobileMfaWebauthnVerify',
      summary: 'Verify WebAuthn MFA response',
      description:
        'Verifies the WebAuthn authentication response against the pending challenge. ' +
        'Returns JWT tokens on success.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MfaWebAuthnVerifyRequestSchema).schema,
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
