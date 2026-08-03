import { NextResponse } from 'next/server';
import { ProductService } from '@/auth/services/product.service';
import { ProductSchema } from '@/auth/validation/admin.schema';
import { InsufficientRoleError } from '@/auth/dal';
import { SessionExpiredError } from '@/auth/errors/auth-errors';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    
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
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[API] Error updating product:', error);
    
    if (error instanceof InsufficientRoleError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof SessionExpiredError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((error instanceof Error ? error.message : String(error)) === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if ((error instanceof Error ? error.message : String(error)).includes('Validation')) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const productService = new ProductService();
    await productService.deleteProduct(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[API] Error deleting product:', error);
    
    if (error instanceof InsufficientRoleError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof SessionExpiredError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((error instanceof Error ? error.message : String(error)) === 'Product not found or could not be deleted') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
