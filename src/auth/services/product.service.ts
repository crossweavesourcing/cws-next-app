import { ProductRepository } from '../repositories/product.repository';
import { requireCmsPermission } from '../dal';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { ObjectId } from 'mongodb';
import { CatalogDocumentService } from './catalog-document.service';

export class ProductService {
  private productRepo = new ProductRepository();

  async createProduct(
    data: { categoryId: string | null; name: string; slug: string; shortDescription: string; overview: string; visible: boolean },
    imageFile: File | null,
    galleryFiles: File[],
    manufacturing: unknown,
    features: unknown,
    specifications: unknown
  ) {
    await requireCmsPermission('products');

    if (!imageFile || imageFile.size === 0) {
      throw new Error('Main image is required');
    }

    // Upload main image
    const mainImageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageUrl = await uploadToCloudinary(mainImageBuffer, 'cws_products');

    // Handle gallery images
    const galleryUrls: string[] = [];
    for (const file of galleryFiles) {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'cws_products');
        galleryUrls.push(url);
      }
    }

    const newProduct = await this.productRepo.create({
      categoryId: data.categoryId ? new ObjectId(data.categoryId) : null,
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      overview: data.overview,
      image: imageUrl,
      images: galleryUrls,
      manufacturing: manufacturing as string[],
      specifications: specifications as { material: string; productionFocus: string; finishing: string; quality: string; },
      features: features as string[],
      visible: data.visible,
    });

    return newProduct;
  }

  async updateProduct(
    id: string,
    data: { categoryId: string | null; name: string; slug: string; shortDescription: string; overview: string; visible: boolean },
    featuredMediaUrl: string | null,
    existingGalleryUrls: string[],
    imageFile: File | null,
    galleryFiles: File[],
    manufacturing: unknown,
    features: unknown,
    specifications: unknown
  ) {
    await requireCmsPermission('products');

    const existingProduct = await this.productRepo.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    let imageUrl = featuredMediaUrl || existingProduct.image;
    if (imageFile && imageFile.size > 0) {
      const mainImageBuffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadToCloudinary(mainImageBuffer, 'cws_products');
    }

    const galleryUrls: string[] = Array.isArray(existingGalleryUrls) ? [...existingGalleryUrls] : [];
    const validGalleryFiles = Array.isArray(galleryFiles) ? galleryFiles.filter(file => file && file.size > 0) : [];
    
    if (validGalleryFiles.length > 0) {
      for (const file of validGalleryFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'cws_products');
        galleryUrls.push(url);
      }
    }

    const updated = await this.productRepo.update(id, {
      categoryId: data.categoryId ? new ObjectId(data.categoryId) : null,
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      overview: data.overview,
      image: imageUrl,
      images: galleryUrls,
      manufacturing: manufacturing as string[],
      features: features as string[],
      specifications: specifications as { material: string; productionFocus: string; finishing: string; quality: string; },
      visible: data.visible,
    });

    if (!updated) {
      throw new Error('Failed to update product in database');
    }

    return true;
  }

  async deleteProduct(id: string) {
    await requireCmsPermission('products');
    const deleted = await this.productRepo.delete(id);
    if (!deleted) {
      throw new Error('Product not found or could not be deleted');
    }
    await new CatalogDocumentService().handleAssociationDeletion('productId', id);
    return true;
  }
}
