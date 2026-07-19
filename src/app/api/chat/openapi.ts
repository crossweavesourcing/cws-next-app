import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000).meta({
    description: 'User message to send to the ZXY Co-Pilot',
    example: 'What sustainable fabrics do you recommend for a summer polo shirt?',
  }),
  history: z
    .array(
      z.object({
        sender: z.enum(['user', 'assistant']).meta({ example: 'user' }),
        text: z.string().meta({ example: 'Hello, I need sourcing advice.' }),
      }),
    )
    .max(50)
    .optional()
    .meta({
      description: 'Previous conversation history for context',
    }),
});

export const ChatSuccessResponseSchema = z.object({
  text: z.string().meta({
    description: 'AI-generated response in markdown format',
    example: '*Based on ZXY sustainable sourcing parameters:*\n\nFor a summer polo, we recommend GOTS-certified 100% Organic Cotton at 180 GSM.',
  }),
});

export const chatPath = {
  '/api/chat': {
    post: {
      operationId: 'sendChatMessage',
      summary: 'Send message to ZXY Co-Pilot',
      description:
        'Sends a message to the ZXY Intelligent Sourcing Co-Pilot (Google Gemini). ' +
        'Requires authentication (cookie or bearer). ' +
        'Returns a simulated response when the Gemini API key is not configured.',
      tags: [TAGS.GENERAL],
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(ChatRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'AI response generated successfully',
          content: {
            'application/json': {
              schema: createSchema(ChatSuccessResponseSchema).schema,
            },
          },
        },
        '400': {
          description: 'Missing message payload',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '401': {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
        '500': {
          description: 'Gemini API error (message not disclosed to client)',
          content: {
            'application/json': {
              schema: createSchema(ErrorSchema).schema,
            },
          },
        },
      },
    },
  },
};
