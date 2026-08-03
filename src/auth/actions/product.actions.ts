'use server';

import { ProductService } from '@/auth/services/product.service';
import { ProductSchema } from '@/auth/validation/admin.schema';
import { revalidatePath } from 'next/cache';
import { sanitizeRichText } from '@/lib/sanitization';

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

    const longDescription = formData.get('longDescription') as string | null;
    const materials = formData.get('materials') as string | null;
    const process = formData.get('process') as string | null;
    const qualityControl = formData.get('qualityControl') as string | null;
    const customization = formData.get('customization') as string | null;
    const applications = formData.get('applications') as string | null;
    const packaging = formData.get('packaging') as string | null;

    const faqs = JSON.parse((formData.get('faqs') as string) || '[]');
    const relatedProducts = JSON.parse((formData.get('relatedProducts') as string) || '[]');
    const seoOverrides = JSON.parse((formData.get('seoOverrides') as string) || '{}');

    const parsed = ProductSchema.safeParse({ 
      categoryId, name, slug, shortDescription, overview, visible,
      longDescription, materials, process, qualityControl, customization, applications, packaging,
      faqs, relatedProducts, seoOverrides
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    // Sanitize rich text fields
    if (parsed.data.longDescription) parsed.data.longDescription = sanitizeRichText(parsed.data.longDescription);
    if (parsed.data.materials) parsed.data.materials = sanitizeRichText(parsed.data.materials);
    if (parsed.data.process) parsed.data.process = sanitizeRichText(parsed.data.process);
    if (parsed.data.qualityControl) parsed.data.qualityControl = sanitizeRichText(parsed.data.qualityControl);
    if (parsed.data.customization) parsed.data.customization = sanitizeRichText(parsed.data.customization);
    if (parsed.data.applications) parsed.data.applications = sanitizeRichText(parsed.data.applications);
    if (parsed.data.packaging) parsed.data.packaging = sanitizeRichText(parsed.data.packaging);
    if (parsed.data.faqs) {
      parsed.data.faqs = parsed.data.faqs.map(f => ({
        question: sanitizeRichText(f.question),
        answer: sanitizeRichText(f.answer),
      }));
    }

    const imageFile = formData.get('image') as File | null;
    const imageAltText = (formData.get('imageAltText') as string) || '';
    const galleryFiles = formData.getAll('images') as File[];
    const imagesAltText = JSON.parse((formData.get('imagesAltText') as string) || '[]');

    const productService = new ProductService();
    const newProduct = await productService.createProduct(
      { ...parsed.data, categoryId: parsed.data.categoryId ?? null },
      imageFile,
      imageAltText,
      galleryFiles,
      imagesAltText,
      manufacturing,
      features,
      specifications
    );

    revalidatePath('/dashboard/products');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath(`/products/${parsed.data.slug}`);
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

    const longDescription = formData.get('longDescription') as string | null;
    const materials = formData.get('materials') as string | null;
    const process = formData.get('process') as string | null;
    const qualityControl = formData.get('qualityControl') as string | null;
    const customization = formData.get('customization') as string | null;
    const applications = formData.get('applications') as string | null;
    const packaging = formData.get('packaging') as string | null;

    const faqs = JSON.parse((formData.get('faqs') as string) || '[]');
    const relatedProducts = JSON.parse((formData.get('relatedProducts') as string) || '[]');
    const seoOverrides = JSON.parse((formData.get('seoOverrides') as string) || '{}');

    const parsed = ProductSchema.safeParse({ 
      categoryId: categoryId || null, name, slug, shortDescription, overview, visible,
      longDescription, materials, process, qualityControl, customization, applications, packaging,
      faqs, relatedProducts, seoOverrides
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    // Sanitize rich text fields
    if (parsed.data.longDescription) parsed.data.longDescription = sanitizeRichText(parsed.data.longDescription);
    if (parsed.data.materials) parsed.data.materials = sanitizeRichText(parsed.data.materials);
    if (parsed.data.process) parsed.data.process = sanitizeRichText(parsed.data.process);
    if (parsed.data.qualityControl) parsed.data.qualityControl = sanitizeRichText(parsed.data.qualityControl);
    if (parsed.data.customization) parsed.data.customization = sanitizeRichText(parsed.data.customization);
    if (parsed.data.applications) parsed.data.applications = sanitizeRichText(parsed.data.applications);
    if (parsed.data.packaging) parsed.data.packaging = sanitizeRichText(parsed.data.packaging);
    if (parsed.data.faqs) {
      parsed.data.faqs = parsed.data.faqs.map(f => ({
        question: sanitizeRichText(f.question),
        answer: sanitizeRichText(f.answer),
      }));
    }

    const imageFile = formData.get('image') as File | null;
    const imageAltText = (formData.get('imageAltText') as string) || '';
    const galleryFiles = formData.getAll('images') as File[];
    const imagesAltText = JSON.parse((formData.get('imagesAltText') as string) || '[]');
    const featuredMediaUrl = formData.get('featuredMediaUrl') as string | null;
    const existingGalleryUrls = JSON.parse((formData.get('existingGalleryUrls') as string) || '[]');

    const productService = new ProductService();
    await productService.updateProduct(
      id,
      { ...parsed.data, categoryId: parsed.data.categoryId ?? null },
      featuredMediaUrl,
      existingGalleryUrls,
      imageFile,
      imageAltText,
      galleryFiles,
      imagesAltText,
      manufacturing,
      features,
      specifications
    );

    revalidatePath('/dashboard/products');
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath(`/products/${parsed.data.slug}`);
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
    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/products/[slug]', 'page');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete product' };
  }
}
