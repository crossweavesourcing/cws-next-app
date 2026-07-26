export const adminSectionsPath = {
  '/api/mobile/v1/admin/sections': {
    get: {
      tags: ['Mobile Admin'],
      summary: 'Get all page section configurations',
      description: 'Admin only. Retrieves page section configurations.',
      operationId: 'getSectionsMobile',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Sections retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['sectionId', 'pageKey', 'label', 'paused', 'content', 'media', 'definition'],
                      properties: {
                        sectionId: { type: 'string' },
                        pageKey: { type: 'string' },
                        label: { type: 'string' },
                        paused: { type: 'boolean' },
                        content: { type: 'object', additionalProperties: true },
                        media: { type: 'object', additionalProperties: true },
                        definition: {
                          type: 'object',
                          description: 'Editor capabilities including content fields and named media slots.',
                          properties: {
                            fields: { type: 'array', items: { type: 'object' } },
                            mediaSlots: { type: 'array', items: { type: 'object' } },
                            visibilityEditable: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  }
                }
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
