import 'dotenv/config';
import { SeoService } from '../src/auth/services/seo.service';
import { ObjectId } from 'mongodb';

async function validateBackend() {
  const service = new SeoService();
  // Mock an admin user ID for testing
  const testAdminId = new ObjectId(); 
  
  console.log('1. Testing Global Settings...');
  const settings = await service.updateGlobalSettings({ 
    brandName: 'Cross Weave Sourcing (Validated)',
    contactEmail: 'hello@crossweavesourcing.com'
  }, testAdminId);
  console.log('✅ Global Settings Saved:', settings);

  console.log('\n2. Testing Redirects Creation...');
  // Ensure we don't duplicate if script is run twice
  try {
    const newRedirect = await service.createRedirect({
      source: '/spring-sale-2026',
      destination: '/products/cotton-blend-cardigan',
      statusCode: 307,
      active: true,
    }, testAdminId);
    console.log('✅ Redirect Created:', newRedirect);
  } catch (e: any) {
    console.log('⚠️ Redirect might already exist:', e.message);
  }

  console.log('\n3. Testing Redirect Fetch...');
  const activeRedirect = await service.getActiveRedirectBySource('/spring-sale-2026');
  if (activeRedirect) {
    console.log('✅ Catch-All will successfully find this redirect and route to:', activeRedirect.destination);
  } else {
    console.log('❌ Failed to fetch redirect.');
  }
  
  process.exit(0);
}

validateBackend().catch(console.error);
