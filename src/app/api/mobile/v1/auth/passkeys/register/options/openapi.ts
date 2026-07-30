import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const mobilePasskeyRegisterOptionsPath = {
  '/api/mobile/v1/auth/passkeys/register/options': {
    post: {
      operationId: 'mobilePasskeyRegisterOptions',
      summary: 'Deprecated mobile passkey registration options',
      description: 'Mobile passkey registration is unavailable until mobile device binding is supported.',
      deprecated: true,
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      responses: {
        '410': { description: 'Mobile passkeys unavailable', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '400': { description: 'Cannot start registration', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '401': { description: 'Unauthorized', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
