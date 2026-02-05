import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FreeResource from '../models/FreeResource.js';
import Resource from '../models/Resource.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI (or MONGO_URI) not set');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined });

  const freeQuery = { publishStatus: 'published', isPublished: true, isActive: true, resourceType: { $in: ['notes','document'] } };
  const freeCount = await FreeResource.countDocuments(freeQuery);
  console.log('FreeResource published count:', freeCount);

  const resourceQuery = { resourceCategory: 'notes', status: 'published', isActive: true, isPublic: true, $or: [{ price: 0 }, { freeResourceId: { $exists: true, $ne: null } }] };
  const resourceDocs = await Resource.find(resourceQuery).populate('freeResourceId').lean();
  console.log('Resource-based notes matching query:', resourceDocs.length);

  // Show sample ids
  console.log('Sample FreeResource ids:', (await FreeResource.find(freeQuery).limit(5).select('_id')).map(d=>d._id.toString()));
  console.log('Sample Resource ids:', resourceDocs.slice(0,5).map(d=>d._id.toString()));

  await mongoose.disconnect();
}

main().catch(e=>{console.error(e);process.exit(1);});