import { getDb, getMongoClient } from '@/database/client';
import { COLLECTION_NAMES } from '@/database/constants';
import * as fs from 'fs';
import * as path from 'path';

const OLD_EMAIL = 'admin@crossweavesourcing.com';
const NEW_EMAIL = 'mamunofficialmail@gmail.com';

async function updateAdminEmail() {
  console.log(`🔄 Updating admin email from ${OLD_EMAIL} to ${NEW_EMAIL}...`);

  const db = await getDb();
  const emailsCollection = db.collection(COLLECTION_NAMES.USER_EMAILS);

  // Check if target email already exists
  const existingNew = await emailsCollection.findOne({ email: NEW_EMAIL });

  // Find old email record
  const oldRecord = await emailsCollection.findOne({ email: OLD_EMAIL });

  if (existingNew) {
    console.log(`ℹ️  Email ${NEW_EMAIL} already exists in the database.`);
  } else if (oldRecord) {
    await emailsCollection.updateOne(
      { _id: oldRecord._id },
      {
        $set: {
          email: NEW_EMAIL,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`✅ Updated database record: ${OLD_EMAIL} ➔ ${NEW_EMAIL}`);
  } else {
    // Fallback: update any primary email user
    const primaryRecord = await emailsCollection.findOne({ primary: true });
    if (primaryRecord) {
      await emailsCollection.updateOne(
        { _id: primaryRecord._id },
        {
          $set: {
            email: NEW_EMAIL,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✅ Updated primary admin email record: ${primaryRecord.email} ➔ ${NEW_EMAIL}`);
    } else {
      console.warn(`⚠️ No existing user email record found to update.`);
    }
  }

  // Update .env file if ADMIN_SEED_EMAIL or EMAIL_USER is present
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;

    if (envContent.includes(`ADMIN_SEED_EMAIL=${OLD_EMAIL}`)) {
      envContent = envContent.replace(
        `ADMIN_SEED_EMAIL=${OLD_EMAIL}`,
        `ADMIN_SEED_EMAIL=${NEW_EMAIL}`
      );
      updated = true;
    }

    if (envContent.includes('ADMIN_SEED_EMAIL=')) {
      envContent = envContent.replace(
        /ADMIN_SEED_EMAIL=.*/g,
        `ADMIN_SEED_EMAIL=${NEW_EMAIL}`
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`✅ Updated .env file: ADMIN_SEED_EMAIL=${NEW_EMAIL}`);
    }
  }

  console.log('🎉 Admin email update completed successfully.');
}

updateAdminEmail()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const client = await getMongoClient();
      await client.close();
    } catch {
      // Ignore cleanup error
    }
  });
