import { NextResponse } from 'next/server';
import { CategoryService } from '@/auth/services/category.service';
import { CategorySchema } from '@/auth/validation/admin.schema';
import { InsufficientRoleError } from '@/auth/dal';
import { SessionExpiredError } from '@/auth/errors/auth-errors';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const visible = formData.get('visible') === 'true';
    const imageFile = formData.get('image') as File | null;

    const parsed = CategorySchema.safeParse({ name, slug, description, visible });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const categoryService = new CategoryService();
    const newCategory = await categoryService.createCategory(parsed.data, imageFile);

    return NextResponse.json({ success: true, categoryId: newCategory._id.toString() }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API] Error creating category:', error);
    
    if (error instanceof InsufficientRoleError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof SessionExpiredError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((error instanceof Error ? error.message : String(error)) === 'Image is required' || (error instanceof Error ? error.message : String(error)).includes('Validation')) {
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
