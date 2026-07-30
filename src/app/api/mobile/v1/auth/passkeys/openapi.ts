import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const PasskeySummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  credentialDeviceType: z.string().nullable(),
  credentialBackedUp: z.boolean().nullable(),
  transports: z.array(z.string()),
  deviceObjectId: z.string().nullable(),
  deviceName: z.string().nullable(),
  deviceType: z.string().nullable(),
  browser: z.string().nullable(),
  operatingSystem: z.string().nullable(),
  trusted: z.boolean().nullable(),
  blocked: z.boolean().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const mobilePasskeysPath = {
  '/api/mobile/v1/auth/passkeys': {
    get: {
      operationId: 'mobilePasskeysList',
      summary: 'List passkeys',
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Registered passkeys', content: { 'application/json': { schema: createSchema(z.object({ passkeys: z.array(PasskeySummarySchema) })).schema } } },
        '401': { description: 'Unauthorized', content: { 'application/json': { schema: createSchema(ErrorSchema).schema } } },
      },
    },
  },
};
