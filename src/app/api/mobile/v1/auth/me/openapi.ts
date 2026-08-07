import { TAGS } from '@/lib/api/tags';

export const mobileMePath = {
  '/api/mobile/v1/auth/me': {
    get: {
      operationId: 'mobileGetCurrentUser',
      summary: 'Get current user profile',
      description:
        'Returns the authenticated user profile including role, status, and profile details. ' +
        'Requires a valid mobile bearer JWT.',
      tags: [TAGS.MOBILE_AUTH],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'User profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'MongoDB ObjectId', example: '507f1f77bcf86cd799439011' },
                  role: { type: 'string', enum: ['super_admin', 'admin', 'manager'], example: 'super_admin' },
                  permissions: { type: 'array', items: { type: 'string', enum: ['overview', 'page_content', 'categories', 'products'] } },
                  status: { type: 'string', enum: ['active', 'suspended', 'disabled', 'deleted'], example: 'active' },
                  profile: {
                    type: 'object',
                    properties: {
                      displayName: { type: 'string', example: 'Johnny' },
                      fullName: { type: ['string', 'null'], example: 'John Doe' },
                      employeeId: { type: ['string', 'null'], example: 'EMP-0001' },
                      department: { type: ['string', 'null'], example: 'Engineering' },
                    },
                  },
                },
                required: ['id', 'role', 'permissions', 'status', 'profile'],
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized — missing or invalid bearer token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Unauthorized.' },
                },
              },
            },
          },
        },
      },
    },
  },
};
