

export const adminCategoriesPath = {
  '/api/mobile/v1/admin/categories': {
    post: {
      tags: ['Mobile Admin'],
      summary: 'Create a new category',
      description: 'Admin only. Creates a new category.',
      operationId: 'createCategoryMobile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                visible: { type: 'boolean' },
                image: { type: 'string', format: 'binary' },
              },
              required: ['name', 'slug', 'description', 'visible', 'image'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Category created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  categoryId: { type: 'string' }
                }
              },
            },
          },
        },
        '400': {
          description: 'Validation failed',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } } } },
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
