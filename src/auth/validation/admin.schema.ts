import * as z from 'zod/v4';

export const CategorySchema = z.object({
  name: z.string().min(1, 'Name is required').meta({ example: 'New Category' }),
  slug: z.string().min(1, 'Slug is required').meta({ example: 'new-category' }),
  description: z.string().min(1, 'Description is required').meta({ example: 'Category description' }),
  visible: z.boolean().meta({ example: true }),
}).meta({ id: 'Category' });

export const ProductSchema = z.object({
  categoryId: z.string().optional().nullable().meta({ example: '507f1f77bcf86cd799439011' }),
  name: z.string().min(1, 'Name is required').meta({ example: 'New Product' }),
  slug: z.string().min(1, 'Slug is required').meta({ example: 'new-product' }),
  shortDescription: z.string().min(1, 'Short description is required').meta({ example: 'Short desc' }),
  overview: z.string().min(1, 'Overview is required').meta({ example: 'Full overview' }),
  visible: z.boolean().meta({ example: true }),
  
  // New Optional Fields
  longDescription: z.string().optional(),
  materials: z.string().optional(),
  process: z.string().optional(),
  qualityControl: z.string().optional(),
  customization: z.string().optional(),
  applications: z.string().optional(),
  packaging: z.string().optional(),
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required')
  })).optional(),
  relatedProducts: z.array(z.string()).optional(),
  seoOverrides: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonicalUrl: z.string().optional(),
    noindex: z.boolean().optional()
  }).optional(),
}).meta({ id: 'Product' });
