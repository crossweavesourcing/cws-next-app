'use server';

import { requireActiveSession, requireRole } from '@/auth/dal';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const productSchema = z.object({
  categoryId: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  overview: z.string().min(1, 'Overview is required'),
  visible: z.boolean(),
  // Add other fields parsing as needed or stringify arrays/objects from formData
});

export async function createProduct(formData: FormData) {
  try {
    await requireActiveSession();
    await requireRole('admin');

    // Parse simple fields
    const categoryId = formData.get('categoryId') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const overview = formData.get('overview') as string;
    const visible = formData.get('visible') === 'true';

    // Arrays and objects (passed as JSON strings)
    const manufacturing = JSON.parse((formData.get('manufacturing') as string) || '[]');
    const features = JSON.parse((formData.get('features') as string) || '[]');
    const specifications = JSON.parse((formData.get('specifications') as string) || '{}');

    const parsed = productSchema.safeParse({ categoryId, name, slug, shortDescription, overview, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const imageFile = formData.get('image') as File | null;
    if (!imageFile || imageFile.size === 0) {
      return { success: false, error: 'Main image is required' };
    }

    // Upload main image
    const mainImageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageUrl = await uploadToCloudinary(mainImageBuffer, 'cws_products');

    // Handle gallery images
    const galleryFiles = formData.getAll('images') as File[];
    const galleryUrls: string[] = [];
    
    for (const file of galleryFiles) {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'cws_products');
        galleryUrls.push(url);
      }
    }

    const productRepo = new ProductRepository();
    const newProduct = await productRepo.create({
      categoryId: parsed.data.categoryId ? new ObjectId(parsed.data.categoryId) : null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription,
      overview: parsed.data.overview,
      image: imageUrl,
      images: galleryUrls,
      manufacturing,
      specifications,
      features,
      visible: parsed.data.visible,
    });

    revalidatePath('/dashboard/products');
    return { success: true, productId: newProduct._id.toString() };
  } catch (error: any) {
    console.error('Error creating product:', error);
    return { success: false, error: error.message || 'Failed to create product' };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    await requireActiveSession();
    await requireRole('admin');

    const categoryId = formData.get('categoryId') as string | null;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const overview = formData.get('overview') as string;
    const visible = formData.get('visible') === 'true';

    const manufacturing = JSON.parse((formData.get('manufacturing') as string) || '[]');
    const features = JSON.parse((formData.get('features') as string) || '[]');
    const specifications = JSON.parse((formData.get('specifications') as string) || '{}');

    const parsed = productSchema.safeParse({ categoryId: categoryId || null, name, slug, shortDescription, overview, visible });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const productRepo = new ProductRepository();
    const existingProduct = await productRepo.findById(id);
    if (!existingProduct) {
      return { success: false, error: 'Product not found' };
    }

    let imageUrl = existingProduct.image;
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile.size > 0) {
      const mainImageBuffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadToCloudinary(mainImageBuffer, 'cws_products');
    }

    // Currently we either keep the existing gallery or completely replace it if new files are provided.
    // Assuming the form allows providing new files to overwrite the gallery:
    const galleryFiles = formData.getAll('images') as File[];
    let galleryUrls: string[] = existingProduct.images || [];
    
    // Check if any valid files are uploaded
    const validGalleryFiles = galleryFiles.filter(file => file && file.size > 0);
    if (validGalleryFiles.length > 0) {
      galleryUrls = [];
      for (const file of validGalleryFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'cws_products');
        galleryUrls.push(url);
      }
    }

    const updated = await productRepo.update(id, {
      categoryId: parsed.data.categoryId ? new ObjectId(parsed.data.categoryId) : null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription,
      overview: parsed.data.overview,
      image: imageUrl,
      images: galleryUrls,
      manufacturing,
      specifications,
      features,
      visible: parsed.data.visible,
    });

    if (!updated) {
      return { success: false, error: 'Failed to update product in database' };
    }

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

export async function deleteProduct(id: string) {
  try {
    await requireActiveSession();
    await requireRole('admin');

    const productRepo = new ProductRepository();
    const deleted = await productRepo.delete(id);

    if (!deleted) {
      return { success: false, error: 'Product not found or could not be deleted' };
    }

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}
