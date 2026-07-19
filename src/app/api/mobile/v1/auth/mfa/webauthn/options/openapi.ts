import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const MfaWebAuthnOptionsRequestSchema = z.object({
  challengeToken: z.string().min(1).meta({
    description: 'Challenge token from login response',
    example: 'eyJhbGciOiJIUzI1NiJ9...',
  }),
});

export const mobileMfaWebauthnOptionsPath = {
  '/api/mobile/v1/auth/mfa/webauthn/options': {
    post: {
      operationId: 'mobileMfaWebauthnOptions',
      summary: 'Get WebAuthn MFA options',
      description:
        'Generates WebAuthn authentication options for the pending MFA challenge. ' +
        'Returns PublicKeyCredentialRequestOptions for the client to use with navigator.credentials.get().',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(MfaWebAuthnOptionsRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'WebAuthn options generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'PublicKeyCredentialRequestOptions',
                properties: {
                  challenge: { type: 'string' },
                  rpId: { type: 'string' },
                  timeout: { type: 'integer', example: 60000 },
                  allowCredentials: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string', example: 'public-key' },
                      },
                    },
                  },
                  userVerification: { type: 'string', example: 'preferred' },
                },
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
