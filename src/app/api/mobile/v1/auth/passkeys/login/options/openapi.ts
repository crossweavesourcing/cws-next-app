import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const mobilePasskeyLoginOptionsPath = {
  '/api/mobile/v1/auth/passkeys/login/options': {
    post: {
      operationId: 'mobilePasskeyLoginOptions',
      summary: 'Deprecated mobile passkey login options',
      description: 'Mobile passkey login is unavailable until mobile device binding is supported.',
      deprecated: true,
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      responses: {
        '410': { description: 'Mobile passkeys unavailable', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
