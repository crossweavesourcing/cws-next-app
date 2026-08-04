'use server';

import { CategoryService } from '@/auth/services/category.service';
import { CategorySchema } from '@/auth/validation/admin.schema';
import { revalidatePath } from 'next/cache';
import { withCsrfGuard } from '@/auth/lib/csrf';
import { normalizeSeoOverrides } from '@/lib/seo/config';

function checked(formData: FormData, name: string) {
  return formData.getAll(name).includes('true');
}

async function _createCategory(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = checked(formData, 'visible');
    const imageFile = formData.get('image') as File | null;

    const seoOverrides = normalizeSeoOverrides({
      title: (formData.get('seoOverrides.title') as string) || undefined,
      description: (formData.get('seoOverrides.description') as string) || undefined,
      canonicalUrl: (formData.get('seoOverrides.canonicalUrl') as string) || undefined,
      noindex: checked(formData, 'seoOverrides.noindex'),
      nofollow: checked(formData, 'seoOverrides.nofollow'),
      includeInSitemap: checked(formData, 'seoOverrides.includeInSitemap'),
      socialTitle: (formData.get('seoOverrides.socialTitle') as string) || undefined,
      socialDescription: (formData.get('seoOverrides.socialDescription') as string) || undefined,
      socialImage: (formData.get('seoOverrides.socialImage') as string) || undefined,
      breadcrumbLabel: (formData.get('seoOverrides.breadcrumbLabel') as string) || undefined,
    });

    const parsed = CategorySchema.safeParse({ name, slug, description, visible, seoOverrides });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const categoryService = new CategoryService();
    const newCategory = await categoryService.createCategory(parsed.data, imageFile);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/categories/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    return { success: true, categoryId: newCategory._id.toString() };
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create category' };
  }
}

async function _updateCategory(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = checked(formData, 'visible');
    const imageFile = formData.get('image') as File | null;

    const seoOverrides = normalizeSeoOverrides({
      title: (formData.get('seoOverrides.title') as string) || undefined,
      description: (formData.get('seoOverrides.description') as string) || undefined,
      canonicalUrl: (formData.get('seoOverrides.canonicalUrl') as string) || undefined,
      noindex: checked(formData, 'seoOverrides.noindex'),
      nofollow: checked(formData, 'seoOverrides.nofollow'),
      includeInSitemap: checked(formData, 'seoOverrides.includeInSitemap'),
      socialTitle: (formData.get('seoOverrides.socialTitle') as string) || undefined,
      socialDescription: (formData.get('seoOverrides.socialDescription') as string) || undefined,
      socialImage: (formData.get('seoOverrides.socialImage') as string) || undefined,
      breadcrumbLabel: (formData.get('seoOverrides.breadcrumbLabel') as string) || undefined,
    });

    const parsed = CategorySchema.safeParse({ name, slug, description, visible, seoOverrides });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const categoryService = new CategoryService();
    await categoryService.updateCategory(id, parsed.data, imageFile);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath(`/categories/${parsed.data.slug}`);
    revalidatePath('/categories/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update category' };
  }
}

async function _deleteCategory(id: string) {
  try {
    const categoryService = new CategoryService();
    await categoryService.deleteCategory(id);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/categories/[slug]', 'page');
    revalidatePath('/sitemap.xml');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete category' };
  }
}

export const createCategory = withCsrfGuard(_createCategory);
export const updateCategory = withCsrfGuard(_updateCategory);
export const deleteCategory = withCsrfGuard(_deleteCategory);
