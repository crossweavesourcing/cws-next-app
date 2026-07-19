import 'dotenv/config';
import { ProductRepository } from './src/auth/repositories/product.repository';

async function run() {
  const repo = new ProductRepository();
  try {
    const p = await repo.create({
      categoryId: null,
      name: 'Test Product',
      slug: 'test-product',
      shortDescription: 'test',
      overview: 'test',
      image: 'test.jpg',
      images: [],
      manufacturing: [],
      specifications: { material: 'a', productionFocus: 'b', finishing: 'c', quality: 'd' },
      features: [],
      visible: true
    });
    console.log('Success!', p._id);
    await repo.delete(p._id);
  } catch (err) {
    console.error('Failed:', err);
  }
  process.exit(0);
}
run();
