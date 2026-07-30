import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const WebAuthnRegisterVerifyRequestSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  response: z.object({
    attestationObject: z.string(),
    clientDataJSON: z.string(),
    transports: z.array(z.string()).optional(),
  }),
  type: z.literal('public-key'),
  clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  authenticatorAttachment: z.string().optional(),
});

export const webauthnRegisterVerifyPath = {
  '/api/auth/webauthn/register-verify': {
    post: {
      operationId: 'webauthnRegisterVerify',
      summary: 'Verify WebAuthn registration response',
      description: 'Verifies a passkey registration response and stores the credential for the active dashboard user.',
      tags: [TAGS.AUTH],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: createSchema(WebAuthnRegisterVerifyRequestSchema).schema } },
      },
      responses: {
        '200': {
          description: 'Passkey registered',
          content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true } }, required: ['success'] } } },
        },
        '400': { description: 'Invalid registration response', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '401': { description: 'Unauthorized or expired challenge', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '403': { description: 'Request blocked', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
