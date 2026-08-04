import * as z from 'zod/v4';

export const CategorySchema = z.object({
  name: z.string().min(1, 'Name is required').meta({ example: 'New Category' }),
  slug: z.string().min(1, 'Slug is required').meta({ example: 'new-category' }),
  description: z.string().min(1, 'Description is required').meta({ example: 'Category description' }),
  visible: z.boolean().meta({ example: true }),
  seoOverrides: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonicalUrl: z.string().optional(),
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    includeInSitemap: z.boolean().optional(),
    socialTitle: z.string().optional(),
    socialDescription: z.string().optional(),
    socialImage: z.string().optional(),
    breadcrumbLabel: z.string().optional(),
    primaryTopic: z.string().optional(),
    secondaryTopics: z.array(z.string()).optional(),
    reviewStatus: z.enum(['draft', 'needs_review', 'approved']).optional(),
    internalNotes: z.string().optional(),
    lastReviewedAt: z.string().optional()
  }).optional(),
}).meta({ id: 'Category' });

export const CatalogSchema = z.object({
  title: z.string().min(1, 'Title is required').meta({ example: 'Summer Catalog 2024' }),
  slug: z.string().min(1, 'Slug is required').meta({ example: 'summer-catalog-2024' }),
  description: z.string().min(1, 'Description is required').meta({ example: 'Our summer collection...' }),
  categoryId: z.string().optional().nullable().meta({ example: '507f1f77bcf86cd799439011' }),
  productId: z.string().optional().nullable().meta({ example: '507f1f77bcf86cd799439012' }),
  status: z.enum(['draft', 'published']).meta({ example: 'draft' }),
  seoOverrides: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonicalUrl: z.string().optional(),
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    includeInSitemap: z.boolean().optional(),
    socialTitle: z.string().optional(),
    socialDescription: z.string().optional(),
    socialImage: z.string().optional(),
    breadcrumbLabel: z.string().optional(),
    primaryTopic: z.string().optional(),
    secondaryTopics: z.array(z.string()).optional(),
    reviewStatus: z.enum(['draft', 'needs_review', 'approved']).optional(),
    internalNotes: z.string().optional(),
    lastReviewedAt: z.string().optional()
  }).optional(),
}).meta({ id: 'Catalog' });

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
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    includeInSitemap: z.boolean().optional(),
    socialTitle: z.string().optional(),
    socialDescription: z.string().optional(),
    socialImage: z.string().optional(),
    breadcrumbLabel: z.string().optional(),
    primaryTopic: z.string().optional(),
    secondaryTopics: z.array(z.string()).optional(),
    reviewStatus: z.enum(['draft', 'needs_review', 'approved']).optional(),
    internalNotes: z.string().optional(),
    lastReviewedAt: z.string().optional()
  }).optional(),
}).meta({ id: 'Product' });
