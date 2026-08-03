import { getDb } from '../src/database/client';
import { productsSchema } from '../src/database/schemas/products.schema';

async function migrate() {
  const db = await getDb();
  
  console.log('Applying updated product schema validation...');
  await db.command({
    collMod: 'products',
    validator: {
      $jsonSchema: productsSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });

  console.log('Product schema successfully updated with optional content fields.');
  console.log('Existing documents remain valid as new fields are strictly optional.');
  
  console.log('Migration Complete.');
  process.exit(0);
}

migrate().catch(console.error);
