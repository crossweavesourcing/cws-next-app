import { CategoryRepository } from '../repositories/category.repository';
import { requireCmsPermission } from '../dal';
import { uploadToCloudinary } from '@/lib/cloudinary';

export class CategoryService {
  private categoryRepo = new CategoryRepository();

  async createCategory(
    data: { name: string; slug: string; description: string; visible: boolean },
    imageFile: File | null
  ) {
    await requireCmsPermission('categories');

    if (!imageFile || imageFile.size === 0) {
      throw new Error('Image is required');
    }

    console.log('[createCategory] Starting Cloudinary upload...', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      folder: 'cws_categories',
    });

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    let imageUrl: string;
    try {
      imageUrl = await uploadToCloudinary(buffer, 'cws_categories');
      console.log('[createCategory] Cloudinary upload successful:', imageUrl);
    } catch (uploadError: unknown) {
      console.error('[createCategory] Cloudinary upload failed explicitly:', JSON.stringify(uploadError, null, 2));
      throw new Error('Cloudinary upload failed (403). Please check your API keys or folder permissions.');
    }

    const newCategory = await this.categoryRepo.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: imageUrl,
      visible: data.visible,
    });

    return newCategory;
  }

  async updateCategory(
    id: string,
    data: { name: string; slug: string; description: string; visible: boolean },
    imageFile: File | null
  ) {
    await requireCmsPermission('categories');

    const existingCategory = await this.categoryRepo.findById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    let imageUrl = existingCategory.image;

    // Only upload if a new file is provided
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadToCloudinary(buffer, 'cws_categories');
    }

    const updated = await this.categoryRepo.update(id, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: imageUrl,
      visible: data.visible,
    });

    if (!updated) {
      throw new Error('Failed to update category in database');
    }

    return true;
  }

  async deleteCategory(id: string) {
    await requireCmsPermission('categories');
    const deleted = await this.categoryRepo.delete(id);
    if (!deleted) {
      throw new Error('Category not found or could not be deleted');
    }
    return true;
  }
}
