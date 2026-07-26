import { getDb } from '@/database/client';
import { COLLECTION_NAMES } from '@/database/constants';
import type { UserDocument } from '@/types/auth';

/**
 * One-time migration script to transition from flat admin/member/viewer roles
 * to the hierarchical super_admin/admin/manager structure with permissions.
 */
export async function migrateRoles(): Promise<void> {
  const db = await getDb();
  console.log('Starting role migration...');

  // 1. Update the schema validation rules
  try {
    const collections = await db.listCollections({ name: COLLECTION_NAMES.USERS }).toArray();
    if (collections.length > 0) {
      console.log('Updating users collection schema validator...');
      // We don't overwrite the whole schema here in the script, because the app
      // boot process (init-db.ts) automatically synchronizes the schema from
      // users.schema.ts. 
      const { initializeDatabase } = await import('@/database/init');
      await initializeDatabase();
      console.log('Schema synchronized successfully.');
    }
  } catch (error) {
    console.warn('Could not synchronize schema:', error);
  }

  const usersCollection = db.collection<UserDocument>(COLLECTION_NAMES.USERS);

  // 2. Convert old 'admin' to 'super_admin'
  const adminUpdate = await usersCollection.updateMany(
    { role: 'admin' }, // Type assertion because 'admin' behavior changed
    { 
      $set: { 
        role: 'super_admin',
        updatedAt: new Date()
      } 
    }
  );
  console.log(`Migrated ${adminUpdate.modifiedCount} 'admin' users to 'super_admin'`);

  // 3. Convert 'member' and 'viewer' to 'manager' (with no permissions)
  const memberUpdate = await usersCollection.updateMany(
    // @ts-expect-error legacy role value
    { role: { $in: ['member', 'viewer'] } },
    { 
      $set: { 
        role: 'manager',
        permissions: [],
        updatedAt: new Date()
      } 
    }
  );
  console.log(`Migrated ${memberUpdate.modifiedCount} legacy users to 'manager'`);

  // 4. Ensure all users have a permissions array
  const permUpdate = await usersCollection.updateMany(
    { permissions: { $exists: false } },
    { 
      $set: { 
        permissions: [],
        updatedAt: new Date()
      } 
    }
  );
  console.log(`Added empty permissions array to ${permUpdate.modifiedCount} users`);

  console.log('Migration complete.');
}

if (require.main === module) {
  migrateRoles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
