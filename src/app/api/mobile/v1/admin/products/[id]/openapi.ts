

export const adminProductUpdatePath = {
  '/api/mobile/v1/admin/products/{id}': {
    put: {
      tags: ['Mobile Admin'],
      summary: 'Update an existing product',
      description: 'Admin only. Updates an existing product.',
      operationId: 'updateProductMobile',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Product ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                categoryId: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
                shortDescription: { type: 'string' },
                overview: { type: 'string' },
                visible: { type: 'boolean' },
                manufacturing: { type: 'string', description: 'JSON stringified array' },
                features: { type: 'string', description: 'JSON stringified array' },
                specifications: { type: 'string', description: 'JSON stringified object' },
                image: { type: 'string', format: 'binary' },
                images: { type: 'array', items: { type: 'string', format: 'binary' } },
              },
              required: ['name', 'slug', 'shortDescription', 'overview', 'visible'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Product updated successfully',
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
          description: 'Product not found',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '500': {
          description: 'Internal server error',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
      },
    },
    delete: {
      tags: ['Mobile Admin'],
      summary: 'Delete a product',
      description: 'Admin only. Deletes a product.',
      operationId: 'deleteProductMobile',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Product ID',
        },
      ],
      responses: {
        '200': {
          description: 'Product deleted successfully',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { success: { type: 'boolean' } } },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '403': {
          description: 'Forbidden - Insufficient permissions',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
        },
        '404': {
          description: 'Product not found',
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
