import { seedUsers } from './seed-users';
import { getMongoClient } from '@/database/client';

async function main() {
  await seedUsers();
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const client = await getMongoClient();
      await client.close();
    } catch {
      // Ignore cleanup errors
    }
  });
