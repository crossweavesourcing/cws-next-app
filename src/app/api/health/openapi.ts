import * as z from 'zod/v4';
import { TAGS } from '@/lib/api/tags';

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']).meta({
    description: 'Overall health status',
    example: 'healthy',
  }),
  database: z
    .object({
      status: z.enum(['connected', 'disconnected']).meta({
        description: 'MongoDB connection status',
        example: 'connected',
      }),
    })
    .optional(),
});

export const healthPath = {
  '/api/health': {
    get: {
      operationId: 'healthCheck',
      summary: 'Database health check',
      description:
        'Returns the health status of the application and its database connection. ' +
        'Returns 200 when healthy, 503 when degraded.',
      tags: [TAGS.HEALTH],
      security: [],
      responses: {
        '200': {
          description: 'Application is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                    example: 'healthy',
                  },
                },
                required: ['status'],
              },
            },
          },
        },
        '503': {
          description: 'Application is unhealthy (database connection failure)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                    example: 'unhealthy',
                  },
                },
                required: ['status'],
              },
            },
          },
        },
      },
    },
  },
};
