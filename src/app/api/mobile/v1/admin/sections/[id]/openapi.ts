export const adminSectionUpdatePath = {
  '/api/mobile/v1/admin/sections/{id}': {
    patch: {
      tags: ['Mobile Admin'],
      summary: 'Update section visibility, content, or a named media slot',
      description: 'Admin only. Saves section-aware content and visibility, replaces a named media slot, or resets a slot to its default.',
      operationId: 'updateSectionMobile',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Section ID (e.g. home-hero)',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                paused: { type: 'boolean' },
                content: { type: 'object', additionalProperties: true },
                resetMediaSlot: { type: 'string' },
              },
            },
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                paused: { type: 'string', enum: ['true', 'false'] },
                content: { type: 'string', description: 'JSON-encoded section content object.' },
                mediaSlot: { type: 'string', description: 'Named slot from the section definition. Legacy requests without this field target the primary slot.' },
                media: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Section updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '403': {
          description: 'Forbidden - Requires admin role',
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
