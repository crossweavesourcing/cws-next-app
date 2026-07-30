import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

const SuccessSchema = z.object({ success: z.boolean() });

export const mobilePasskeyByIdPath = {
  '/api/mobile/v1/auth/passkeys/{id}': {
    patch: {
      operationId: 'mobilePasskeyRename',
      summary: 'Rename a passkey',
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: createSchema(z.object({ name: z.string().max(80) })).schema } } },
      responses: {
        '200': { description: 'Passkey renamed', content: { 'application/json': { schema: createSchema(SuccessSchema).schema } } },
        '401': { description: 'Unauthorized', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '404': { description: 'Not found', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
    delete: {
      operationId: 'mobilePasskeyRemove',
      summary: 'Remove a passkey',
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Passkey removed', content: { 'application/json': { schema: createSchema(SuccessSchema).schema } } },
        '401': { description: 'Unauthorized', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
