import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from './category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { requireRole } from '../dal';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { ObjectId } from 'mongodb';

vi.mock('../repositories/category.repository');
vi.mock('../dal');
vi.mock('@/lib/cloudinary');

describe('CategoryService', () => {
  let service: CategoryService;
  let mockCategoryRepo: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CategoryService();
    mockCategoryRepo = (service as any).categoryRepo;
    
    // Default mocks
    vi.mocked(requireRole).mockResolvedValue({ userId: new ObjectId() } as any);
  });

  describe('createCategory', () => {
    it('throws error if no image file provided', async () => {
      await expect(service.createCategory(
        { name: 'Test', slug: 'test', description: 'desc', visible: true },
        null
      )).rejects.toThrow('Image is required');
    });

    it('creates category successfully with image', async () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      vi.mocked(uploadToCloudinary).mockResolvedValue('https://cloudinary.com/test.jpg');
      mockCategoryRepo.create.mockResolvedValue({ _id: new ObjectId(), name: 'Test' } as any);

      const result = await service.createCategory(
        { name: 'Test', slug: 'test', description: 'desc', visible: true },
        file
      );

      expect(requireRole).toHaveBeenCalledWith('admin');
      expect(uploadToCloudinary).toHaveBeenCalled();
      expect(mockCategoryRepo.create).toHaveBeenCalledWith({
        name: 'Test',
        slug: 'test',
        description: 'desc',
        image: 'https://cloudinary.com/test.jpg',
        visible: true,
      });
      expect(result.name).toBe('Test');
    });
  });

  describe('updateCategory', () => {
    it('throws if category not found', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(service.updateCategory(
        '507f1f77bcf86cd799439011',
        { name: 'Test', slug: 'test', description: 'desc', visible: true },
        null
      )).rejects.toThrow('Category not found');
    });

    it('updates category successfully without new image', async () => {
      mockCategoryRepo.findById.mockResolvedValue({ _id: new ObjectId(), image: 'old.jpg' } as any);
      mockCategoryRepo.update.mockResolvedValue(true);

      const result = await service.updateCategory(
        '507f1f77bcf86cd799439011',
        { name: 'Updated', slug: 'test', description: 'desc', visible: true },
        null
      );

      expect(uploadToCloudinary).not.toHaveBeenCalled();
      expect(mockCategoryRepo.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        name: 'Updated',
        slug: 'test',
        description: 'desc',
        image: 'old.jpg',
        visible: true,
      });
      expect(result).toBe(true);
    });

    it('updates category successfully with new image', async () => {
      const file = new File(['new'], 'new.jpg', { type: 'image/jpeg' });
      mockCategoryRepo.findById.mockResolvedValue({ _id: new ObjectId(), image: 'old.jpg' } as any);
      vi.mocked(uploadToCloudinary).mockResolvedValue('https://cloudinary.com/new.jpg');
      mockCategoryRepo.update.mockResolvedValue(true);

      const result = await service.updateCategory(
        '507f1f77bcf86cd799439011',
        { name: 'Updated', slug: 'test', description: 'desc', visible: true },
        file
      );

      expect(uploadToCloudinary).toHaveBeenCalled();
      expect(mockCategoryRepo.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        name: 'Updated',
        slug: 'test',
        description: 'desc',
        image: 'https://cloudinary.com/new.jpg',
        visible: true,
      });
      expect(result).toBe(true);
    });
  });
});
