import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';
import { WebAuthnLoginOptionsResponseSchema } from '../login-options/openapi';

export const webauthnRegisterOptionsPath = {
  '/api/auth/webauthn/register-options': {
    post: {
      operationId: 'webauthnRegisterOptions',
      summary: 'Get WebAuthn registration options',
      description: 'Generates passkey registration options for the active dashboard session.',
      tags: [TAGS.AUTH],
      security: [{ cookieAuth: [] }],
      responses: {
        '200': {
          description: 'Registration options generated',
          content: { 'application/json': { schema: createSchema(WebAuthnLoginOptionsResponseSchema.extend({
            rp: z.object({ name: z.string(), id: z.string().optional() }).optional(),
            user: z.object({ id: z.string(), name: z.string(), displayName: z.string() }).optional(),
          })).schema } },
        },
        '400': { description: 'Cannot start registration', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '401': { description: 'Unauthorized', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '403': { description: 'Request blocked', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
