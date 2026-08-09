import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cws';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const logs = await db.collection('audit_logs')
    .find({ action: 'auth.risk.evaluated' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
  console.log(JSON.stringify(logs, null, 2));
  
  const devices = await db.collection('devices')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
  console.log("DEVICES:", JSON.stringify(devices, null, 2));

  await client.close();
}

main().catch(console.error);
