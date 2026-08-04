import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const PageSeoSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  path: z.string().min(1, 'Path is required'),
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
  lastReviewedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  createdBy: z.instanceof(ObjectId).nullable().optional(),
  updatedAt: z.date().optional(),
  updatedBy: z.instanceof(ObjectId).nullable().optional(),
});
