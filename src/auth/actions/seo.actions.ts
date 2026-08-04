'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SeoService, SeoValidationError } from '@/auth/services/seo.service';
import { requireCmsPermission } from '@/auth/dal';
import { withCsrfGuard } from '@/auth/lib/csrf';
import { assertInternalRedirectDestination, assertInternalRedirectSource, normalizeCanonicalUrl } from '@/lib/seo/config';

export const GlobalSettingsInputSchema = z.object({
  brandName: z.string().max(200).optional(),
  defaultSocialImage: z.string().max(1000).optional(),
  organizationName: z.string().max(200).optional(),
  organizationLegalName: z.string().max(200).optional(),
  organizationUrl: z.string().url().max(1000).optional().or(z.literal('')),
  organizationLogo: z.string().max(1000).optional(),
  contactEmail: z.string().email().max(254).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  contactAddress: z.string().max(1000).optional(),
  socialLinks: z.array(z.string().url().max(1000)).max(20).optional(),
  defaultSeoTitle: z.string().max(200).optional(),
  defaultSeoDescription: z.string().max(500).optional(),
  siteName: z.string().max(200).optional(),
  googleSiteVerification: z.string().max(100).optional(),
  bingSiteVerification: z.string().max(100).optional(),
  gtmId: z.string().max(50).optional(),
});

export const RedirectInputSchema = z.object({
  source: z.string().min(1).max(2000).transform(assertInternalRedirectSource),
  destination: z.string().min(1).max(2000).transform(assertInternalRedirectDestination),
  statusCode: z.union([z.literal(301), z.literal(302)]),
  active: z.boolean(),
  reason: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  startsAt: z.preprocess((value) => typeof value === 'string' && value.trim() ? new Date(value) : undefined, z.date().optional()),
  endsAt: z.preprocess((value) => typeof value === 'string' && value.trim() ? new Date(value) : undefined, z.date().optional()),
});

export const PageSeoInputSchema = z.object({
  path: z.string().min(1).max(2000),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  canonicalUrl: z.preprocess((value) => typeof value === 'string' ? normalizeCanonicalUrl(value) ?? '' : value, z.string().max(1000).optional().or(z.literal(''))),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  includeInSitemap: z.boolean().optional(),
  socialTitle: z.string().trim().max(200).optional(),
  socialDescription: z.string().trim().max(500).optional(),
  socialImage: z.string().trim().max(1000).optional(),
  breadcrumbLabel: z.string().trim().max(120).optional(),
  primaryTopic: z.string().trim().max(120).optional(),
  secondaryTopics: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  reviewStatus: z.enum(['draft', 'needs_review', 'approved']).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
  lastReviewedAt: z.preprocess((value) => typeof value === 'string' && value.trim() ? new Date(value) : undefined, z.date().optional()),
});

async function _saveGlobalSettingsAction(formData: FormData) {
  try {
    const session = await requireCmsPermission('seo');

    const rawData: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'socialLinks') continue;
      if (typeof value === 'string' && value.trim() !== '') {
        rawData[key] = value.trim();
      }
    }

    const socialLinks = formData.getAll('socialLinks').filter(
      (v) => typeof v === 'string' && v.trim() !== ''
    ) as string[];

    if (socialLinks.length > 0) {
      rawData.socialLinks = socialLinks;
    }

    const validatedData = GlobalSettingsInputSchema.parse(rawData);

    const service = new SeoService();
    await service.updateGlobalSettings(validatedData, session.userId);


    revalidatePath('/', 'layout');

    return { success: true as const };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Validation failed.', details: error.issues };
    }
    if (error instanceof SeoValidationError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

async function _createRedirectAction(formData: FormData) {
  try {
    const session = await requireCmsPermission('seo');
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = RedirectInputSchema.parse({
      ...rawData,
      statusCode: Number(rawData.statusCode),
      active: rawData.active === 'true',
      startsAt: rawData.startsAt,
      endsAt: rawData.endsAt,
    });

    const service = new SeoService();
    await service.createRedirect(validatedData, session.userId);


    revalidatePath('/dashboard/seo');

    return { success: true as const };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Validation failed.', details: error.issues };
    }
    if (error instanceof SeoValidationError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

async function _updateRedirectAction(id: string, formData: FormData) {
  try {
    const session = await requireCmsPermission('seo');
    const rawData = Object.fromEntries(formData.entries());
    const partialSchema = RedirectInputSchema.partial();

    const parsedData: Record<string, unknown> = { ...rawData };
    if (rawData.statusCode) parsedData.statusCode = Number(rawData.statusCode);
    if (rawData.active !== undefined) parsedData.active = rawData.active === 'true';
    if (typeof rawData.startsAt !== 'string' || !rawData.startsAt.trim()) delete parsedData.startsAt;
    if (typeof rawData.endsAt !== 'string' || !rawData.endsAt.trim()) delete parsedData.endsAt;

    const validatedData = partialSchema.parse(parsedData);

    const service = new SeoService();
    await service.updateRedirect(id, validatedData, session.userId);


    revalidatePath('/dashboard/seo');

    return { success: true as const };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Validation failed.', details: error.issues };
    }
    if (error instanceof SeoValidationError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

async function _deleteRedirectAction(id: string) {
  try {
    await requireCmsPermission('seo');

    const service = new SeoService();
    await service.deleteRedirect(id);

    revalidatePath('/dashboard/seo');

    return { success: true as const };
  } catch (error) {
    if (error instanceof SeoValidationError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

async function _savePageSeoAction(formData: FormData) {
  try {
    const session = await requireCmsPermission('seo');
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = PageSeoInputSchema.parse({
      ...rawData,
      noindex: rawData.noindex === 'true',
      nofollow: rawData.nofollow === 'true',
      includeInSitemap: rawData.includeInSitemap !== 'false',
    });

    const service = new SeoService();
    await service.savePageSeo(validatedData, session.userId);

    revalidatePath('/', 'layout');

    return { success: true as const };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Validation failed.', details: error.issues };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

async function _deletePageSeoAction(id: string) {
  try {
    await requireCmsPermission('seo');

    const service = new SeoService();
    await service.deletePageSeo(id);

    revalidatePath('/', 'layout');

    return { success: true as const };
  } catch {
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

export const saveGlobalSettingsAction = withCsrfGuard(_saveGlobalSettingsAction);
export const createRedirectAction = withCsrfGuard(_createRedirectAction);
export const updateRedirectAction = withCsrfGuard(_updateRedirectAction);
export const deleteRedirectAction = withCsrfGuard(_deleteRedirectAction);
export const savePageSeoAction = withCsrfGuard(_savePageSeoAction);
export const deletePageSeoAction = withCsrfGuard(_deletePageSeoAction);
