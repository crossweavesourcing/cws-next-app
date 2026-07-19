import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { categoryCards, products as staticProducts } from '@/lib/products';
import { ObjectId } from 'mongodb';

export async function seedCatalog() {
  console.log('🌱 Seeding Catalog (Categories & Products)...');

  const categoryRepo = new CategoryRepository();
  const productRepo = new ProductRepository();

  // Check if categories already exist
  const existingCategories = await categoryRepo.findAll();
  if (existingCategories.length > 0) {
    console.log(`✅ Catalog already seeded (${existingCategories.length} categories found). Skipping.`);
    return;
  }

  // 1. Seed Categories
  const categoryMap = new Map<string, ObjectId>();

  for (const card of categoryCards) {
    const slug = card.name.toLowerCase().replace(/\s+/g, '-');
    const newCategory = await categoryRepo.create({
      name: card.name,
      slug,
      description: card.description,
      image: card.image,
      visible: true,
    });
    categoryMap.set(card.name, newCategory._id);
    console.log(`   Created category: ${newCategory.name} (${newCategory._id})`);
  }

  // 2. Seed Products
  for (const product of staticProducts) {
    const categoryId = categoryMap.get(product.category);
    
    if (!categoryId) {
      console.warn(`   ⚠️ Warning: Category '${product.category}' not found for product '${product.name}'. Skipping.`);
      continue;
    }

    const newProduct = await productRepo.create({
      categoryId,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      overview: product.overview,
      image: product.image,
      images: product.images,
      manufacturing: product.manufacturing,
      specifications: product.specifications,
      features: product.features,
      visible: true,
    });
    console.log(`   Created product: ${newProduct.name} (${newProduct._id})`);
  }

  console.log('✅ Catalog seeding complete.');
}
