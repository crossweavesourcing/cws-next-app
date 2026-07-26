import { TAGS } from '@/lib/api/tags';

export const loginPath = {
  '/api/auth/login': {
    post: {
      operationId: 'webPasswordLogin',
      summary: 'Authenticate the dashboard password form',
      description: 'Same-origin HTML form endpoint. On completion it returns a 303 redirect to the dashboard, an MFA/password-change step, or the login page with a safe error code.',
      tags: [TAGS.AUTH],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', format: 'password' },
                rememberMe: { type: 'string', enum: ['on', 'true'] },
              },
            },
          },
        },
      },
      responses: {
        '303': { description: 'Authentication flow redirect; secure cookies may be set.' },
      },
    },
  },
};
