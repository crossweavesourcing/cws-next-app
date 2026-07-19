import { createSchema } from 'zod-openapi';
import { TAGS } from '@/lib/api/tags';

export const logoutPath = {
  '/api/auth/logout': {
    post: {
      operationId: 'logout',
      summary: 'Terminate session and clear cookies',
      description:
        'Revokes the current session and all refresh tokens in the family, then clears ' +
        'session, refresh, and device token cookies. Protected by CSRF (Origin/Referer check).',
      tags: [TAGS.AUTH],
      security: [{ cookieAuth: [] }],
      responses: {
        '204': {
          description: 'Session terminated successfully (no content)',
        },
        '403': {
          description: 'CSRF validation failed (missing or mismatched Origin/Referer)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {},
              },
            },
          },
        },
      },
    },
  },
};
