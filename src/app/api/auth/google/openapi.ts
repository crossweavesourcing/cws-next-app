import { TAGS } from '@/lib/api/tags';

export const googleStartPath = {
  '/api/auth/google': {
    get: {
      operationId: 'googleOAuthStart',
      summary: 'Start Google OAuth flow',
      description:
        'Initiates the Google Authorization Code + PKCE flow. Sets a short-lived httpOnly ' +
        'state cookie containing the PKCE verifier and nonce, then redirects to Google consent screen. ' +
        'Returns 503 if Google OAuth is not configured.',
      tags: [TAGS.AUTH],
      security: [],
      responses: {
        '302': {
          description: 'Redirect to Google OAuth consent screen',
          headers: {
            Location: {
              description: 'Google OAuth authorization URL',
              schema: { type: 'string', format: 'uri' },
            },
          },
        },
        '503': {
          description: 'Google OAuth not configured (GOOGLE_CLIENT_SECRET missing)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Google sign-in is not available. Contact an administrator.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
