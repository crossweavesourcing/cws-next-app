import { describe, it, expect } from 'vitest';
import { assembleOpenApiDocument, EXCLUDED_ROUTES } from '@/lib/api/assemble';
import {
  ErrorSchema,
  ValidationErrorSchema,
  UnauthorizedSchema,
  NotFoundSchema,
} from '@/lib/api/errors';
import { SECURITY_SCHEMES } from '@/lib/api/security';
import { TAGS } from '@/lib/api/tags';

const EXPECTED_DOCUMENTED_OPERATIONS = [
  { method: 'GET', path: '/api/health', operationId: 'healthCheck' },
  { method: 'POST', path: '/api/contact', operationId: 'submitContactForm' },
  { method: 'POST', path: '/api/chat', operationId: 'sendChatMessage' },
  { method: 'POST', path: '/api/auth/webauthn/login-options', operationId: 'webauthnLoginOptions' },
  { method: 'POST', path: '/api/auth/webauthn/login-verify', operationId: 'webauthnLoginVerify' },
  { method: 'POST', path: '/api/auth/logout', operationId: 'logout' },
  { method: 'POST', path: '/api/auth/refresh', operationId: 'refreshSession' },
  { method: 'GET', path: '/api/auth/google', operationId: 'googleOAuthStart' },
  { method: 'GET', path: '/api/auth/google/callback', operationId: 'googleOAuthCallback' },
  { method: 'POST', path: '/api/mobile/v1/auth/password', operationId: 'mobilePasswordLogin' },
  { method: 'POST', path: '/api/mobile/v1/auth/mfa/email', operationId: 'mobileMfaEmailVerify' },
  { method: 'POST', path: '/api/mobile/v1/auth/mfa/totp', operationId: 'mobileMfaTotpVerify' },
  { method: 'POST', path: '/api/mobile/v1/auth/mfa/webauthn/options', operationId: 'mobileMfaWebauthnOptions' },
  { method: 'POST', path: '/api/mobile/v1/auth/mfa/webauthn/verify', operationId: 'mobileMfaWebauthnVerify' },
  { method: 'GET', path: '/api/mobile/v1/auth/me', operationId: 'mobileGetCurrentUser' },
  { method: 'POST', path: '/api/mobile/v1/auth/refresh', operationId: 'mobileRefreshToken' },
  { method: 'POST', path: '/api/mobile/v1/auth/google', operationId: 'mobileGoogleLogin' },
  { method: 'POST', path: '/api/mobile/v1/auth/logout', operationId: 'mobileLogout' },
  { method: 'GET', path: '/api/mobile/v1/users/{id}', operationId: 'getUserById' },
  { method: 'GET', path: '/api/mobile/v1/.well-known/jwks.json', operationId: 'getMobileJwks' },
];

describe('OpenAPI Document Assembly', () => {
  const doc = assembleOpenApiDocument();

  it('produces a valid OpenAPI 3.1.0 document', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('CWS Next App API');
    expect(doc.info.version).toBeDefined();
  });

  it('includes all required security schemes', () => {
    const schemes = doc.components?.securitySchemes;
    expect(schemes).toBeDefined();
    expect(schemes).toHaveProperty('cookieAuth');
    expect(schemes).toHaveProperty('bearerAuth');
    expect(schemes).toHaveProperty('pendingSession');

    expect(schemes!.cookieAuth).toEqual(
      expect.objectContaining({ type: 'apiKey', in: 'cookie', name: 'cws_session' }),
    );
    expect(schemes!.bearerAuth).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }),
    );
  });

  it('includes all expected tags', () => {
    const tagNames = doc.tags?.map((t) => t.name) ?? [];
    expect(tagNames).toContain(TAGS.HEALTH);
    expect(tagNames).toContain(TAGS.USERS);
    expect(tagNames).toContain(TAGS.AUTH);
    expect(tagNames).toContain(TAGS.MOBILE_AUTH);
  });

  it('has unique operation IDs across all paths', () => {
    const operationIds: string[] = [];
    for (const pathItem of Object.values(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | { operationId?: string }
          | undefined;
        if (operation?.operationId) {
          operationIds.push(operation.operationId);
        }
      }
    }
    expect(operationIds.length).toBeGreaterThan(0);
    const unique = new Set(operationIds);
    expect(unique.size).toBe(operationIds.length);
  });

  it('documents all 19 expected API operations', () => {
    for (const expected of EXPECTED_DOCUMENTED_OPERATIONS) {
      const pathItem = doc.paths?.[expected.path];
      expect(pathItem).toBeDefined();
      const operation = (pathItem as Record<string, unknown>)[expected.method.toLowerCase()] as Record<string, unknown>;
      expect(operation).toBeDefined();
      expect(operation.operationId).toBe(expected.operationId);
    }
  });

  it('has 20 documented operations matching the expected count', () => {
    let count = 0;
    for (const pathItem of Object.values(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if ((pathItem as Record<string, unknown>)[method]) count++;
      }
    }
    expect(count).toBe(20);
  });

  it('documents the representative user endpoint with all expected fields', () => {
    const userPath = doc.paths?.['/api/mobile/v1/users/{id}'];
    expect(userPath).toBeDefined();

    const getOp = (userPath as Record<string, unknown>).get as Record<string, unknown>;
    expect(getOp).toBeDefined();
    expect(getOp.operationId).toBe('getUserById');
    expect(getOp.summary).toBeDefined();
    expect(getOp.security).toEqual([{ bearerAuth: [] }]);

    const params = getOp.parameters as Array<Record<string, unknown>>;
    expect(params.length).toBe(2);

    const idParam = params.find((p) => p.name === 'id');
    expect(idParam).toBeDefined();
    expect(idParam!.in).toBe('path');
    expect(idParam!.required).toBe(true);

    const fieldsParam = params.find((p) => p.name === 'fields');
    expect(fieldsParam).toBeDefined();
    expect(fieldsParam!.in).toBe('query');
    expect(fieldsParam!.required).toBe(false);

    const responses = getOp.responses as Record<string, unknown>;
    expect(responses).toHaveProperty('200');
    expect(responses).toHaveProperty('400');
    expect(responses).toHaveProperty('401');
    expect(responses).toHaveProperty('404');
  });

  it('every documented operation has at least one response', () => {
    for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | { responses?: Record<string, unknown> }
          | undefined;
        if (operation) {
          expect(operation.responses, `${method.toUpperCase()} ${path} must have responses`).toBeDefined();
          expect(
            Object.keys(operation.responses!).length,
            `${method.toUpperCase()} ${path} must have at least one response`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every documented operation has a summary', () => {
    for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | { summary?: string }
          | undefined;
        if (operation) {
          expect(operation.summary, `${method.toUpperCase()} ${path} must have a summary`).toBeTruthy();
        }
      }
    }
  });

  it('every documented operation has tags', () => {
    for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | { tags?: string[] }
          | undefined;
        if (operation) {
          expect(operation.tags, `${method.toUpperCase()} ${path} must have tags`).toBeDefined();
          expect(operation.tags!.length, `${method.toUpperCase()} ${path} must have at least one tag`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('Route Exclusion Configuration', () => {
  it('excludes only OPTIONS handlers', () => {
    for (const exclusion of EXCLUDED_ROUTES) {
      expect(exclusion.method).toBe('OPTIONS');
    }
  });

  it('has all required fields for each exclusion', () => {
    for (const exclusion of EXCLUDED_ROUTES) {
      expect(exclusion.method).toBeTruthy();
      expect(exclusion.path).toBeTruthy();
      expect(exclusion.reason).toBeTruthy();
      expect(exclusion.category).toBe('cors-preflight');
      expect(exclusion.securityVisibility).toBe('public');
      expect(exclusion.whyInappropriate).toBeTruthy();
    }
  });

  it('covers all mobile routes with OPTIONS exclusions', () => {
    const excludedPaths = EXCLUDED_ROUTES.map((e) => e.path);
    expect(excludedPaths).toContain('/api/mobile/v1/auth/me');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/password');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/refresh');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/google');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/logout');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/mfa/email');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/mfa/totp');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/mfa/webauthn/options');
    expect(excludedPaths).toContain('/api/mobile/v1/auth/mfa/webauthn/verify');
    expect(excludedPaths).toContain('/api/mobile/v1/users/{id}');
  });
});

describe('Documentation Coverage', () => {
  it('achieves 100% coverage of applicable operations', () => {
    const doc = assembleOpenApiDocument();
    const documentedOps = new Set<string>();
    for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if ((pathItem as Record<string, unknown>)[method]) {
          documentedOps.add(`${method.toUpperCase()} ${path}`);
        }
      }
    }

    for (const expected of EXPECTED_DOCUMENTED_OPERATIONS) {
      const key = `${expected.method} ${expected.path}`;
      expect(documentedOps.has(key), `Operation ${key} must be documented`).toBe(true);
    }

    const totalApplicable = EXPECTED_DOCUMENTED_OPERATIONS.length;
    const documentedCount = EXPECTED_DOCUMENTED_OPERATIONS.filter((op) =>
      documentedOps.has(`${op.method} ${op.path}`),
    ).length;

    expect(documentedCount).toBe(totalApplicable);
  });
});

describe('Reusable Error Schemas', () => {
  it('ErrorSchema has an error string field', () => {
    const shape = ErrorSchema.shape;
    expect(shape.error).toBeDefined();
  });

  it('ValidationErrorSchema has error and details fields', () => {
    const shape = ValidationErrorSchema.shape;
    expect(shape.error).toBeDefined();
    expect(shape.details).toBeDefined();
  });

  it('UnauthorizedSchema has an error field', () => {
    const shape = UnauthorizedSchema.shape;
    expect(shape.error).toBeDefined();
  });

  it('NotFoundSchema has an error field', () => {
    const shape = NotFoundSchema.shape;
    expect(shape.error).toBeDefined();
  });
});

describe('Security Schemes', () => {
  it('cookieAuth uses cws_session cookie', () => {
    expect(SECURITY_SCHEMES.cookieAuth.name).toBe('cws_session');
    expect(SECURITY_SCHEMES.cookieAuth.type).toBe('apiKey');
    expect(SECURITY_SCHEMES.cookieAuth.in).toBe('cookie');
  });

  it('bearerAuth uses JWT bearer format', () => {
    expect(SECURITY_SCHEMES.bearerAuth.type).toBe('http');
    expect(SECURITY_SCHEMES.bearerAuth.scheme).toBe('bearer');
    expect(SECURITY_SCHEMES.bearerAuth.bearerFormat).toBe('JWT');
  });

  it('pendingSession uses cws_2fa_pending cookie', () => {
    expect(SECURITY_SCHEMES.pendingSession.name).toBe('cws_2fa_pending');
    expect(SECURITY_SCHEMES.pendingSession.type).toBe('apiKey');
    expect(SECURITY_SCHEMES.pendingSession.in).toBe('cookie');
  });
});
