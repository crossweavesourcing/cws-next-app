'use server';

import { revalidatePath } from 'next/cache';
import { SectionService, SectionValidationError, type SectionUpdateInput } from '@/auth/services/section.service';
import { withCsrfGuard } from '@/auth/lib/csrf';

export async function getSectionsAction() {
  try {
    const sections = await new SectionService().getAdminSections();
    return { success: true as const, sections: JSON.parse(JSON.stringify(sections)) };
  } catch {
    return { success: false as const, error: 'Unable to load page sections.' };
  }
}

async function _saveSectionAction(sectionId: string, formData: FormData) {
  try {
    const rawPayload = formData.get('payload');
    if (typeof rawPayload !== 'string') return { success: false as const, error: 'Missing section payload.' };
    const payload = JSON.parse(rawPayload) as SectionUpdateInput;
    const files = new Map<string, File>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('media:') && value instanceof File && value.size > 0) files.set(key.slice(6), value);
    }
    await new SectionService().updateSection(sectionId, payload, files);
    revalidatePath('/dashboard/page-content');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/products/[slug]', 'page');
    revalidatePath('/catalogs/[slug]', 'page');
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof SectionValidationError ? error.message : 'Unable to save this section.';
    return { success: false as const, error: message };
  }
}

export const saveSectionAction = withCsrfGuard(_saveSectionAction);

export async function toggleSectionStatusAction(sectionId: string, paused: boolean) {
  const formData = new FormData();
  formData.set('payload', JSON.stringify({ paused }));
  return saveSectionAction(sectionId, formData);
}

export async function updateSectionMediaAction(sectionId: string, formData: FormData) {
  const media = formData.get('media');
  const slot = formData.get('slot');
  const next = new FormData();
  next.set('payload', JSON.stringify({}));
  if (media instanceof File) next.set(`media:${typeof slot === 'string' ? slot : 'background'}`, media);
  return saveSectionAction(sectionId, next);
}
