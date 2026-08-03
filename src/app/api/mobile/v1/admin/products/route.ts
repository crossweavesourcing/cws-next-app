import { NextResponse } from 'next/server';
import { ProductService } from '@/auth/services/product.service';
import { ProductSchema } from '@/auth/validation/admin.schema';
import { InsufficientRoleError } from '@/auth/dal';
import { SessionExpiredError } from '@/auth/errors/auth-errors';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
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
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
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

    return NextResponse.json({ success: true, productId: newProduct._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API] Error creating product:', error);
    
    if (error instanceof InsufficientRoleError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof SessionExpiredError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((error instanceof Error ? error.message : String(error)) === 'Main image is required' || (error instanceof Error ? error.message : String(error)).includes('Validation')) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
