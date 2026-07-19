import { TAGS } from '@/lib/api/tags';

export const googleCallbackPath = {
  '/api/auth/google/callback': {
    get: {
      operationId: 'googleOAuthCallback',
      summary: 'Google OAuth callback',
      description:
        'Completes the Google OAuth flow. Verifies state (CSRF), exchanges the authorization code, ' +
        'verifies the id_token, links/looks up the user, and issues session + refresh cookies. ' +
        'Handles MFA-required, force-password-change, and step-up statuses by setting pending cookies ' +
        'and redirecting to the appropriate verification page. Rate-limited to 20 attempts per IP per 15 minutes.',
      tags: [TAGS.AUTH],
      security: [],
      parameters: [
        {
          name: 'code',
          in: 'query' as const,
          required: true,
          description: 'Authorization code from Google',
          schema: { type: 'string' },
        },
        {
          name: 'state',
          in: 'query' as const,
          required: true,
          description: 'State parameter for CSRF verification',
          schema: { type: 'string' },
        },
        {
          name: 'error',
          in: 'query' as const,
          required: false,
          description: 'Error from Google (user cancelled, etc.)',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '302': {
          description: 'Redirect based on auth result',
          headers: {
            Location: {
              description:
                'Redirect URL. Possible destinations: /dashboard/ (success), ' +
                '/dashboard/verify-2fa (MFA required or step-up), ' +
                '/dashboard/change-password (force password change), ' +
                '/dashboard/login/?error=... (failure)',
              schema: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
  },
};
