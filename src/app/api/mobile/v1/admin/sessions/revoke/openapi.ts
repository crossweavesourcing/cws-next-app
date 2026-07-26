

export const adminSessionsRevokePath = {
  '/api/mobile/v1/admin/sessions/revoke': {
    post: {
      tags: ['Mobile Admin'],
      summary: 'Revoke user sessions',
      description: 'Admin only. Revokes sessions for a specific user, or globally if no userId is provided.',
      operationId: 'revokeSessionsMobile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userId: { type: 'string', description: 'Optional user ID to revoke. If omitted, revokes all sessions globally.' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Sessions revoked successfully',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' } } },
            },
          },
        },
        '400': {
          description: 'Invalid input',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } } } },
        },
        '401': {
          description: 'Unauthorized',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '403': {
          description: 'Forbidden',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '500': {
          description: 'Internal server error',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
      },
    },
  },
};
