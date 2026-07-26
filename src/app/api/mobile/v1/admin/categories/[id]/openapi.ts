

export const adminCategoryUpdatePath = {
  '/api/mobile/v1/admin/categories/{id}': {
    put: {
      tags: ['Mobile Admin'],
      summary: 'Update an existing category',
      description: 'Admin only. Updates an existing category.',
      operationId: 'updateCategoryMobile',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Category ID',
        },
      ],
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
              required: ['name', 'slug', 'description', 'visible'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Category updated successfully',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' } } },
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
          description: 'Forbidden',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '404': {
          description: 'Category not found',
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
