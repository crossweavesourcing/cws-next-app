import { TAGS } from '@/lib/api/tags';

export const jwksPath = {
  '/api/mobile/v1/.well-known/jwks.json': {
    get: {
      operationId: 'getMobileJwks',
      summary: 'Get mobile JWKS (JSON Web Key Set)',
      description:
        'Returns the public keys used to verify mobile JWT access tokens. ' +
        'Clients should cache the response for up to 5 minutes (Cache-Control: public, max-age=300). ' +
        'Returns 503 if mobile authentication is not configured.',
      tags: [TAGS.MOBILE_AUTH],
      security: [],
      responses: {
        '200': {
          description: 'JWKS document',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  keys: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        kty: { type: 'string', example: 'OKP' },
                        kid: { type: 'string', example: 'key-2026-01' },
                        alg: { type: 'string', example: 'EdDSA' },
                        use: { type: 'string', example: 'sig' },
                        x: { type: 'string', description: 'Base64url-encoded public key' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '503': {
          description: 'Mobile authentication is not configured',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Mobile authentication is not configured.' },
                },
              },
            },
          },
        },
      },
    },
  },
};
