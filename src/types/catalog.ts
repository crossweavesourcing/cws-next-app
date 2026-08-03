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
  imageAltText?: string;
  images: string[];    // Array of Cloudinary URLs or local paths
  imagesAltText?: string[];
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
  
  // New Optional Semantic/SEO Content Fields
  longDescription?: string;
  materials?: string;
  process?: string;
  qualityControl?: string;
  customization?: string;
  applications?: string;
  packaging?: string;
  faqs?: { question: string; answer: string }[];
  relatedProducts?: ObjectId[];
  seoOverrides?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    noindex?: boolean;
  };
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

export type CatalogTextRole = 'title' | 'heading' | 'paragraph' | 'caption' | 'header' | 'footer';

export interface CatalogSceneText {
  content: string;
  transform: [number, number, number, number, number, number];
  width: number;
  height: number;
  fontName: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  direction: string;
  hasEol: boolean;
  role: CatalogTextRole;
  fillColor: number[] | null;
}

export interface CatalogSceneLink {
  rect: [number, number, number, number];
  url: string;
}

export interface CatalogSceneOperation {
  name: string;
  args: unknown[];
  order: number;
  transform: [number, number, number, number, number, number];
  fillColor: number[];
  strokeColor: number[];
  lineWidth: number;
  opacity: number;
}

export interface CatalogScenePage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  text: CatalogSceneText[];
  links: CatalogSceneLink[];
  operations: CatalogSceneOperation[];
  structure: unknown | null;
  unsupportedOperators: Record<string, number>;
}

export interface CatalogScene {
  version: 1;
  pages: CatalogScenePage[];
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
  sceneVersion?: number | null;
  scene?: CatalogScene | null;
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
