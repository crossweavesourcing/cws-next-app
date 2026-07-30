import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const WebAuthnLoginOptionsRequestSchema = z.object({
  email: z.string().email().meta({
    description: 'Account email for email-first passkey login',
    example: 'admin@example.com',
  }),
});

export const WebAuthnLoginOptionsResponseSchema = z.object({
  challenge: z.string().meta({
    description: 'WebAuthn challenge string',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  }),
  rpId: z.string().meta({ description: 'Relying Party ID', example: 'localhost' }),
  timeout: z.number().int().meta({ description: 'Challenge timeout in ms', example: 60000 }),
  allowCredentials: z
    .array(
      z.object({
        id: z.string().meta({ description: 'Credential ID (base64url)' }),
        type: z.literal('public-key').meta({ example: 'public-key' }),
      }),
    )
    .optional()
    .meta({ description: 'Allowed authenticator credentials' }),
  userVerification: z.enum(['preferred', 'required', 'discouraged']).meta({
    description: 'User verification requirement',
    example: 'preferred',
  }),
});

export const webauthnLoginOptionsPath = {
  '/api/auth/webauthn/login-options': {
    post: {
      operationId: 'webauthnLoginOptions',
      summary: 'Get WebAuthn login options',
      description:
        'Generates passwordless passkey authentication options for this enrolled device.',
      tags: [TAGS.AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(WebAuthnLoginOptionsRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'WebAuthn options generated successfully',
          content: {
            'application/json': {
              schema: createSchema(WebAuthnLoginOptionsResponseSchema).schema,
            },
          },
        },
        '401': {
          description: 'Passkey is not available for this device',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '500': {
          description: 'Internal server error',
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
