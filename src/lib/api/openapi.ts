import { createDocument } from 'zod-openapi';
import { SECURITY_SCHEMES } from './security';
import { TAGS } from './tags';

export function buildOpenApiDocument() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'CWS Next App API',
      version: process.env.npm_package_version ?? '0.1.0',
      description:
        'Automated API documentation for the CWS Next App. ' +
        'This document is generated from Zod schemas and route handler metadata.',
      contact: {
        name: 'API Support',
        email: 'api@crossweavesourcing.com',
      },
    },
    servers: [
      {
        url: process.env.APP_URL ?? 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    tags: [
      { name: TAGS.HEALTH, description: 'Health check endpoints' },
      { name: TAGS.GENERAL, description: 'Public general-purpose endpoints' },
      { name: TAGS.AUTH, description: 'Web authentication endpoints (cookie-based)' },
      { name: TAGS.MOBILE_AUTH, description: 'Mobile authentication endpoints (JWT bearer)' },
      { name: TAGS.USERS, description: 'User management endpoints' },
    ],
    components: {
      securitySchemes: SECURITY_SCHEMES,
    },
    paths: {},
  });
}
