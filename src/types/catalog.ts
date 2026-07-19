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
