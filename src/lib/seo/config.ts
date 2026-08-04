import { z } from 'zod';

const PRIVATE_PATH_PREFIXES = [
  '/api',
  '/dashboard',
  '/auth',
  '/login',
  '/preview',
  '/_next',
];

const SAFE_INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/%?#[\]&=+,:;@]*$/;

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeInternalPath(value: string): string {
  const trimmed = value.trim();
  if (!SAFE_INTERNAL_PATH.test(trimmed)) {
    throw new Error('Use a valid public internal path that starts with /.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, 'https://internal.local');
  } catch {
    throw new Error('The path is malformed.');
  }

  const path = parsed.pathname.replace(/\/{2,}/g, '/');
  const withoutTrailingSlash = path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;
  const normalized = `${withoutTrailingSlash}${parsed.search}${parsed.hash}`;
  const lowered = withoutTrailingSlash.toLowerCase();

  if (PRIVATE_PATH_PREFIXES.some((prefix) => lowered === prefix || lowered.startsWith(`${prefix}/`))) {
    throw new Error('Private, API, authentication, preview, and framework paths are not allowed.');
  }

  return normalized;
}

export function normalizeCanonicalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/')) {
    return normalizeInternalPath(trimmed);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Canonical URL must be an HTTPS URL or a public internal path.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Canonical URL must use HTTPS.');
  }

  const pathname = parsed.pathname !== '/' && parsed.pathname.endsWith('/')
    ? parsed.pathname.slice(0, -1)
    : parsed.pathname;
  const lowered = pathname.toLowerCase();
  if (PRIVATE_PATH_PREFIXES.some((prefix) => lowered === prefix || lowered.startsWith(`${prefix}/`))) {
    throw new Error('Canonical URL cannot point to private, API, authentication, or preview paths.');
  }

  parsed.pathname = pathname;
  return parsed.toString();
}

export const safeSeoOverridesSchema = z.object({
  title: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  canonicalUrl: z.preprocess(
    (value) => (typeof value === 'string' ? normalizeCanonicalUrl(value) : value),
    z.string().max(1000).optional(),
  ),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  includeInSitemap: z.boolean().optional(),
  socialTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  socialDescription: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  socialImage: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  breadcrumbLabel: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  primaryTopic: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  secondaryTopics: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  reviewStatus: z.enum(['draft', 'needs_review', 'approved']).optional(),
  internalNotes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  lastReviewedAt: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
}).optional();

export type SafeSeoOverrides = z.infer<typeof safeSeoOverridesSchema>;

export function normalizeSeoOverrides(input: unknown): SafeSeoOverrides {
  const parsed = safeSeoOverridesSchema.parse(input);
  if (!parsed) return undefined;
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    }),
  ) as SafeSeoOverrides;
}

export function assertInternalRedirectSource(value: string): string {
  const normalized = normalizeInternalPath(value);
  if (normalized.includes('#')) {
    throw new Error('Redirect sources cannot include fragments.');
  }
  return normalized;
}

export function assertInternalRedirectDestination(value: string): string {
  const normalized = normalizeInternalPath(value);
  if (normalized.startsWith('/catalogs/') && normalized.endsWith('/source')) {
    throw new Error('Redirects cannot target protected catalog source files.');
  }
  return normalized;
}
