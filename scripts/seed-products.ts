import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { CategoryRepository } from '../src/auth/repositories/category.repository';
import { ProductRepository } from '../src/auth/repositories/product.repository';
import { products as staticProducts } from '../src/lib/products';
import { uploadToCloudinary } from '../src/lib/cloudinary';
import { getDb } from '../src/database/client';

async function uploadLocalImage(imagePath: string, folder: string): Promise<string> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Warning: Image file not found locally: ${fullPath}`);
      return imagePath; // Return the original path if not found
    }
    const buffer = fs.readFileSync(fullPath);
    const url = await uploadToCloudinary(buffer, folder);
    return url;
  } catch (error) {
    console.error(`❌ Error uploading image ${imagePath}:`, error);
    return imagePath; // Fallback to local path on error
  }
}

export async function seedProducts() {
  console.log('🌱 Seeding Products...');

  const categoryRepo = new CategoryRepository();
  const productRepo = new ProductRepository();
  
  // Ensure we have access to the DB instance for raw checks
  const db = await getDb();
  const productsCollection = db.collection('products');

  const existingCategories = await categoryRepo.findAll();
  
  for (const product of staticProducts) {
    // Check if product already exists by slug
    const exists = await productsCollection.findOne({ slug: product.slug });
    if (exists) {
      console.log(`✅ Product '${product.name}' already exists. Skipping.`);
      continue;
    }

    const category = existingCategories.find(c => c.name === product.category);
    const categoryId = category ? category._id : null;

    console.log(`Uploading images for ${product.name}...`);
    const imageUrl = await uploadLocalImage(product.image, 'cws_products');
    
    const galleryUrls: string[] = [];
    for (const img of product.images) {
      const url = await uploadLocalImage(img, 'cws_products');
      galleryUrls.push(url);
    }

    const newProduct = await productRepo.create({
      categoryId,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      overview: product.overview,
      image: imageUrl,
      images: galleryUrls,
      manufacturing: product.manufacturing,
      specifications: product.specifications,
      features: product.features,
      visible: true,
    });
    console.log(`   Created product: ${newProduct.name} (${newProduct._id})`);
  }

  console.log('✅ Product seeding complete.');
}

// Execute if run directly
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
