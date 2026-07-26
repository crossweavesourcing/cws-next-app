'use server';

import { ProductService } from '@/auth/services/product.service';
import { ProductSchema } from '@/auth/validation/admin.schema';
import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  try {
    const categoryId = formData.get('categoryId') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const overview = formData.get('overview') as string;
    const visible = formData.get('visible') === 'true';

    const manufacturing = JSON.parse((formData.get('manufacturing') as string) || '[]');
    const features = JSON.parse((formData.get('features') as string) || '[]');
    const specifications = JSON.parse((formData.get('specifications') as string) || '{}');

    const parsed = ProductSchema.safeParse({ categoryId, name, slug, shortDescription, overview, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const imageFile = formData.get('image') as File | null;
    const galleryFiles = formData.getAll('images') as File[];

    const productService = new ProductService();
    const newProduct = await productService.createProduct(
      { ...parsed.data, categoryId: parsed.data.categoryId ?? null },
      imageFile,
      galleryFiles,
      manufacturing,
      features,
      specifications
    );

    revalidatePath('/dashboard/products');
    return { success: true, productId: newProduct._id.toString() };
  } catch (error: unknown) {
    console.error('Error creating product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product' };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const categoryId = formData.get('categoryId') as string | null;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const overview = formData.get('overview') as string;
    const visible = formData.get('visible') === 'true';

    const manufacturing = JSON.parse((formData.get('manufacturing') as string) || '[]');
    const features = JSON.parse((formData.get('features') as string) || '[]');
    const specifications = JSON.parse((formData.get('specifications') as string) || '{}');

    const parsed = ProductSchema.safeParse({ categoryId: categoryId || null, name, slug, shortDescription, overview, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const imageFile = formData.get('image') as File | null;
    const galleryFiles = formData.getAll('images') as File[];
    const featuredMediaUrl = formData.get('featuredMediaUrl') as string | null;
    const existingGalleryUrls = JSON.parse((formData.get('existingGalleryUrls') as string) || '[]');

    const productService = new ProductService();
    await productService.updateProduct(
      id,
      { ...parsed.data, categoryId: parsed.data.categoryId ?? null },
      featuredMediaUrl,
      existingGalleryUrls,
      imageFile,
      galleryFiles,
      manufacturing,
      features,
      specifications
    );

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update product' };
  }
}

export async function deleteProduct(id: string) {
  try {
    const productService = new ProductService();
    await productService.deleteProduct(id);

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete product' };
  }
}
