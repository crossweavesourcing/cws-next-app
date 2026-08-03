'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SeoService, SeoValidationError } from '@/auth/services/seo.service';
import { requireCmsPermission } from '@/auth/dal';
import { withCsrfGuard } from '@/auth/lib/csrf';

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
});

export const RedirectInputSchema = z.object({
  source: z.string().min(1).max(2000),
  destination: z.string().min(1).max(2000),
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  active: z.boolean(),
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
      active: rawData.active === 'true'
    });
    
    const service = new SeoService();
    await service.createRedirect(validatedData, session.userId);
    

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

async function _updateRedirectAction(id: string, formData: FormData) {
  try {
    const session = await requireCmsPermission('seo');
    const rawData = Object.fromEntries(formData.entries());
    const partialSchema = RedirectInputSchema.partial();
    
    const parsedData: Record<string, unknown> = { ...rawData };
    if (rawData.statusCode) parsedData.statusCode = Number(rawData.statusCode);
    if (rawData.active !== undefined) parsedData.active = rawData.active === 'true';
    
    const validatedData = partialSchema.parse(parsedData);
    
    const service = new SeoService();
    await service.updateRedirect(id, validatedData, session.userId);
    

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

async function _deleteRedirectAction(id: string) {
  try {
    await requireCmsPermission('seo');
    
    const service = new SeoService();
    await service.deleteRedirect(id);
    
    // revalidateTag('seo:redirects');
    revalidatePath('/', 'layout');
    
    return { success: true as const };
  } catch (error) {
    if (error instanceof SeoValidationError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'An unexpected error occurred.' };
  }
}

export const saveGlobalSettingsAction = withCsrfGuard(_saveGlobalSettingsAction);
export const createRedirectAction = withCsrfGuard(_createRedirectAction);
export const updateRedirectAction = withCsrfGuard(_updateRedirectAction);
export const deleteRedirectAction = withCsrfGuard(_deleteRedirectAction);
