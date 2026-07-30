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
      summary: 'Deprecated WebAuthn MFA options',
      description:
        'Deprecated. Passkeys are available for passwordless sign-in only; use email code for verification.',
      deprecated: true,
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
        '410': {
          description: 'WebAuthn MFA is no longer supported',
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
