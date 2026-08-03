'use server';

import { CategoryService } from '@/auth/services/category.service';
import { CategorySchema } from '@/auth/validation/admin.schema';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = formData.get('visible') === 'true';
    const imageFile = formData.get('image') as File | null;

    const parsed = CategorySchema.safeParse({ name, slug, description, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const categoryService = new CategoryService();
    const newCategory = await categoryService.createCategory(parsed.data, imageFile);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    return { success: true, categoryId: newCategory._id.toString() };
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create category' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = formData.get('visible') === 'true';
    const imageFile = formData.get('image') as File | null;

    const parsed = CategorySchema.safeParse({ name, slug, description, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const categoryService = new CategoryService();
    await categoryService.updateCategory(id, parsed.data, imageFile);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update category' };
  }
}

export async function deleteCategory(id: string) {
  try {
    const categoryService = new CategoryService();
    await categoryService.deleteCategory(id);

    revalidatePath('/dashboard/categories');
    revalidatePath('/');
    revalidatePath('/products');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete category' };
  }
}
