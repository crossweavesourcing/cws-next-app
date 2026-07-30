import { TAGS } from '@/lib/api/tags';

export const testCookiesPath = {
  '/api/auth/test-cookies': {
    get: {
      operationId: 'testAuthCookies',
      summary: 'Test auth cookie handling',
      description: 'Diagnostic route that sets a test cookie and redirects to the dashboard login page.',
      tags: [TAGS.AUTH],
      security: [],
      responses: {
        '303': {
          description: 'Redirect to dashboard login after setting a test cookie.',
        },
      },
    },
  },
};
