import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const mobilePasskeyRegisterVerifyPath = {
  '/api/mobile/v1/auth/passkeys/register/verify': {
    post: {
      operationId: 'mobilePasskeyRegisterVerify',
      summary: 'Deprecated mobile passkey registration verification',
      description: 'Mobile passkey registration is unavailable until mobile device binding is supported.',
      deprecated: true,
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      responses: {
        '410': { description: 'Mobile passkeys unavailable', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '400': { description: 'Invalid registration response', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
        '401': { description: 'Unauthorized or expired challenge', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
