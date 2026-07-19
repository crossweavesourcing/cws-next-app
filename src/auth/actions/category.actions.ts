'use server';

import { requireActiveSession, requireRole } from '@/auth/dal';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(1, 'Description is required'),
  visible: z.boolean(),
});

export async function createCategory(formData: FormData) {
  try {
    await requireActiveSession();
    await requireRole('admin');

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = formData.get('visible') === 'true';
    const imageFile = formData.get('image') as File | null;

    const parsed = categorySchema.safeParse({ name, slug, description, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    if (!imageFile || imageFile.size === 0) {
      return { success: false, error: 'Image is required' };
    }

    // Upload image to Cloudinary
    console.log('[createCategory] Starting Cloudinary upload...', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      folder: 'cws_categories'
    });
    
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    let imageUrl: string;
    try {
      imageUrl = await uploadToCloudinary(buffer, 'cws_categories');
      console.log('[createCategory] Cloudinary upload successful:', imageUrl);
    } catch (uploadError: any) {
      console.error('[createCategory] Cloudinary upload failed explicitly:', JSON.stringify(uploadError, null, 2));
      return { success: false, error: 'Cloudinary upload failed (403). Please check your API keys or folder permissions.' };
    }

    const categoryRepo = new CategoryRepository();
    const newCategory = await categoryRepo.create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      image: imageUrl,
      visible: parsed.data.visible,
    });

    revalidatePath('/dashboard/categories');
    return { success: true, categoryId: newCategory._id.toString() };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message || 'Failed to create category' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    await requireActiveSession();
    await requireRole('admin');

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = formData.get('visible') === 'true';
    const imageFile = formData.get('image') as File | null;

    const parsed = categorySchema.safeParse({ name, slug, description, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const categoryRepo = new CategoryRepository();
    const existingCategory = await categoryRepo.findById(id);
    
    if (!existingCategory) {
      return { success: false, error: 'Category not found' };
    }

    let imageUrl = existingCategory.image;
    
    // Only upload if a new file is provided
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadToCloudinary(buffer, 'cws_categories');
    }

    const updated = await categoryRepo.update(id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      image: imageUrl,
      visible: parsed.data.visible,
    });

    if (!updated) {
      return { success: false, error: 'Failed to update category in database' };
    }

    revalidatePath('/dashboard/categories');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message || 'Failed to update category' };
  }
}
