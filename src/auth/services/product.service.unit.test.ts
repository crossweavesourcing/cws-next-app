import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './product.service';
import { ProductRepository } from '../repositories/product.repository';
import { requireCmsPermission } from '../dal';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { ObjectId } from 'mongodb';

vi.mock('../repositories/product.repository');
vi.mock('../dal');
vi.mock('@/lib/cloudinary');

describe('ProductService', () => {
  let service: ProductService;
  let mockProductRepo: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ProductService();
    mockProductRepo = (service as unknown as { productRepo: jest.Mocked<ProductRepository> }).productRepo;
    
    vi.mocked(requireCmsPermission).mockResolvedValue({ userId: new ObjectId() } as unknown as ReturnType<typeof requireCmsPermission>);
  });

  describe('createProduct', () => {
    it('throws error if no main image provided', async () => {
      await expect(service.createProduct(
        { categoryId: null, name: 'Test', slug: 'test', shortDescription: 'desc', overview: 'ov', visible: true },
        null,
        [],
        {}, {}, {}
      )).rejects.toThrow('Main image is required');
    });

    it('creates product successfully with images', async () => {
      const mainFile = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const galleryFile = new File(['gallery'], 'gallery.jpg', { type: 'image/jpeg' });
      
      vi.mocked(uploadToCloudinary)
        .mockResolvedValueOnce('main.jpg')
        .mockResolvedValueOnce('gallery.jpg');
        
      mockProductRepo.create.mockResolvedValue({ _id: new ObjectId(), name: 'Test' } as unknown as ReturnType<typeof mockProductRepo.create>);

      const result = await service.createProduct(
        { categoryId: '507f1f77bcf86cd799439011', name: 'Test', slug: 'test', shortDescription: 'desc', overview: 'ov', visible: true },
        mainFile,
        [galleryFile],
        { man: true }, { feat: true }, { spec: true }
      );

      expect(requireCmsPermission).toHaveBeenCalledWith('products');
      expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
      expect(mockProductRepo.create).toHaveBeenCalledWith({
        categoryId: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test',
        slug: 'test',
        shortDescription: 'desc',
        overview: 'ov',
        image: 'main.jpg',
        images: ['gallery.jpg'],
        manufacturing: { man: true },
        features: { feat: true },
        specifications: { spec: true },
        visible: true,
      });
      expect(result.name).toBe('Test');
    });
  });

  describe('updateProduct', () => {
    it('throws if product not found', async () => {
      mockProductRepo.findById.mockResolvedValue(null);
      await expect(service.updateProduct(
        '507f1f77bcf86cd799439011',
        { categoryId: null, name: 'Test', slug: 'test', shortDescription: 'desc', overview: 'ov', visible: true },
        null, [], null, [], {}, {}, {}
      )).rejects.toThrow('Product not found');
    });

    it('updates product successfully without new images', async () => {
      mockProductRepo.findById.mockResolvedValue({ _id: new ObjectId(), image: 'old.jpg', images: ['old_gal.jpg'] } as unknown as ReturnType<typeof mockProductRepo.findById>);
      mockProductRepo.update.mockResolvedValue(true);

      const result = await service.updateProduct(
        '507f1f77bcf86cd799439011',
        { categoryId: null, name: 'Updated', slug: 'test', shortDescription: 'desc', overview: 'ov', visible: true },
        null,
        ['old_gal.jpg'],
        null,
        [],
        {},
        {},
        {}
      );

      expect(uploadToCloudinary).not.toHaveBeenCalled();
      expect(mockProductRepo.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        categoryId: null,
        name: 'Updated',
        slug: 'test',
        shortDescription: 'desc',
        overview: 'ov',
        image: 'old.jpg',
        images: ['old_gal.jpg'],
        manufacturing: {},
        features: {},
        specifications: {},
        visible: true,
      });
      expect(result).toBe(true);
    });
  });

  describe('deleteProduct', () => {
    it('deletes product successfully', async () => {
      mockProductRepo.delete.mockResolvedValue(true);
      
      const result = await service.deleteProduct('507f1f77bcf86cd799439011');
      
      expect(requireCmsPermission).toHaveBeenCalledWith('products');
      expect(mockProductRepo.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(true);
    });

    it('throws if delete fails', async () => {
      mockProductRepo.delete.mockResolvedValue(false);
      await expect(service.deleteProduct('507f1f77bcf86cd799439011')).rejects.toThrow();
    });
  });
});
