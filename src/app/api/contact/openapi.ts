import * as z from 'zod/v4';
import { createSchema } from 'zod-openapi';
import { ErrorSchema, ValidationErrorSchema } from '@/lib/api/errors';
import { TAGS } from '@/lib/api/tags';

export const ContactRequestSchema = z.object({
  name: z.string().min(1).max(100).meta({
    description: 'Full name of the sender',
    example: 'Jane Doe',
  }),
  email: z.string().email().max(255).meta({
    description: 'Email address',
    example: 'jane@example.com',
  }),
  subject: z.string().min(1).max(200).meta({
    description: 'Message subject line',
    example: 'Partnership Inquiry',
  }),
  message: z.string().min(1).max(5000).meta({
    description: 'Message body',
    example: 'I would like to discuss a potential partnership opportunity.',
  }),
});

export const ContactSuccessResponseSchema = z.object({
  success: z.literal(true).meta({ example: true }),
});

export const ContactErrorResponseSchema = z.object({
  success: z.literal(false).meta({ example: false }),
  error: z.string().meta({ example: 'All fields are required.' }),
});

export const contactPath = {
  '/api/contact': {
    post: {
      operationId: 'submitContactForm',
      summary: 'Submit contact form',
      description:
        'Sends a contact form submission to the configured Google Sheets script. ' +
        'Inputs are sanitized (HTML stripped) and validated before forwarding. ' +
        'Returns 502 if the upstream service is unreachable, 504 on timeout.',
      tags: [TAGS.GENERAL],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: createSchema(ContactRequestSchema).schema,
          },
        },
      },
      responses: {
        '200': {
          description: 'Message sent successfully',
          content: {
            'application/json': {
              schema: createSchema(ContactSuccessResponseSchema).schema,
            },
          },
        },
        '400': {
          description: 'Validation failed (missing fields, invalid email, length exceeded)',
          content: {
            'application/json': {
              schema: createSchema(ContactErrorResponseSchema).schema,
            },
          },
        },
        '500': {
          description: 'Server configuration error (GOOGLE_SCRIPT_URL not set)',
          content: {
            'application/json': {
              schema: createSchema(ContactErrorResponseSchema).schema,
            },
          },
        },
        '502': {
          description: 'Upstream Google Sheets service returned an error',
          content: {
            'application/json': {
              schema: createSchema(ContactErrorResponseSchema).schema,
            },
          },
        },
        '504': {
          description: 'Request timed out connecting to Google Sheets (8s timeout)',
          content: {
            'application/json': {
              schema: createSchema(ContactErrorResponseSchema).schema,
            },
          },
        },
      },
    },
  },
};
