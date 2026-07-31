import type { ObjectId } from 'mongodb';

export interface CategoryDocument {
  _id: ObjectId;
  name: string;        // e.g. "Knit"
  slug: string;        // e.g. "knit"
  description: string;
  image: string;       // Cloudinary URL or local path
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDocument {
  _id: ObjectId;
  categoryId?: ObjectId | null;
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  image: string;       // Cloudinary URL or local path
  images: string[];    // Array of Cloudinary URLs or local paths
  manufacturing: string[];
  specifications: {
    material: string;
    productionFocus: string;
    finishing: string;
    quality: string;
  };
  features: string[];
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CatalogStatus = 'draft' | 'published';

export interface CatalogAsset {
  publicId: string;
  resourceType: 'image';
  format: 'pdf';
  secureUrl: string;
  originalFilename: string;
  bytes: number;
  pages: number;
  version: number;
}

export interface CatalogPage {
  pageNumber: number;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number | null;
}

export interface CatalogDocument {
  _id: ObjectId;
  categoryId: ObjectId | null;
  productId: ObjectId | null;
  title: string;
  slug: string;
  description: string;
  status: CatalogStatus;
  asset: CatalogAsset;
  pages: CatalogPage[];
  markdown: string;
  processingError: string | null;
  publishedAt: Date | null;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedCatalogDocument extends Omit<CatalogDocument, '_id' | 'categoryId' | 'productId' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'publishedAt'> {
  _id: string;
  categoryId: string | null;
  productId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
