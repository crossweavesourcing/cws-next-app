import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const WebAuthnLoginVerifyRequestSchema = z.object({
  id: z.string().meta({ description: 'Authenticator credential ID', example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' }),
  rawId: z.string().meta({ description: 'Raw credential ID (base64url)' }),
  response: z.object({
    authenticatorData: z.string().meta({ description: 'Authenticator data (base64url)' }),
    clientDataJSON: z.string().meta({ description: 'Client data JSON (base64url)' }),
    signature: z.string().meta({ description: 'Signature (base64url)' }),
    userHandle: z.string().optional().meta({ description: 'User handle (base64url)' }),
  }),
  type: z.literal('public-key').meta({ example: 'public-key' }),
  clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
});

export const webauthnLoginVerifyPath = {
  '/api/auth/webauthn/login-verify': {
    post: {
      operationId: 'webauthnLoginVerify',
      summary: 'Verify WebAuthn login response',
      description:
        'Verifies the WebAuthn authentication response against the pending challenge. ' +
        'On success, issues session and refresh cookies and clears pending cookies. ' +
        'Requires cws_2fa_pending/cws_stepup_pending and cws_webauthn_challenge cookies.',
      tags: [TAGS.AUTH],
      security: [{ pendingSession: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(WebAuthnLoginVerifyRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful — session cookies set',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                },
                required: ['success'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid WebAuthn response',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '401': {
          description: 'Session expired or missing challenge cookie',
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
