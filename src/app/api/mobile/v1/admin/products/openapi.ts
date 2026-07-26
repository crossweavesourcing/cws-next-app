

export const adminProductsPath = {
  '/api/mobile/v1/admin/products': {
    post: {
      tags: ['Mobile Admin'],
      summary: 'Create a new product',
      description: 'Admin only. Creates a new product.',
      operationId: 'createProductMobile',
      security: [{ bearerAuth: [] }],
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
              required: ['name', 'slug', 'shortDescription', 'overview', 'visible', 'image'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Product created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  productId: { type: 'string' }
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
