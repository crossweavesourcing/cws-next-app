import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
config();

async function main() {
  const uri = process.env.MONGODB_URI as string;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('cws-next');
    const productsCollection = db.collection('products');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = await productsCollection.find({ $or: [{ imageAltText: { $exists: false } }, { imagesAltText: { $exists: false } }] }).toArray() as any[];
    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updateData: Record<string, string | string[]> = {};

      if (typeof product.imageAltText !== 'string') {
        updateData.imageAltText = product.name || '';
        needsUpdate = true;
      }

      if (!Array.isArray(product.imagesAltText)) {
        updateData.imagesAltText = (product.images || []).map(() => '');
        needsUpdate = true;
      }

      if (needsUpdate) {
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updateData }
        );
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} products with default alt text.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
