import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const mobilePasskeyLoginVerifyPath = {
  '/api/mobile/v1/auth/passkeys/login/verify': {
    post: {
      operationId: 'mobilePasskeyLoginVerify',
      summary: 'Deprecated mobile passkey login verification',
      description: 'Mobile passkey login is unavailable until mobile device binding is supported.',
      deprecated: true,
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      responses: {
        '410': { description: 'Mobile passkeys unavailable', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '400': { description: 'Invalid request', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '401': { description: 'Invalid or expired challenge', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
