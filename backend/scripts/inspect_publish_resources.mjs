import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });
import Resource from '../models/Resource.js';
import FreeResource from '../models/FreeResource.js';

const idsToCheck = [
  '6982b650413bdc370f5dfe1f', // from logs
  '6982bc3e46aa0190a838c6ea', // from logs
];

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI (or MONGO_URI) not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined });
  console.log('Connected to MongoDB');

  for (const id of idsToCheck) {
    try {
      const r = await Resource.findById(id).populate('freeResourceId').lean();
      console.log('\n=== Resource', id, '===');
      if (!r) {
        console.log('Resource not found');
        continue;
      }
      console.log('Resource.status =', r.status, 'isPublic=', r.isPublic, 'isActive=', r.isActive, 'resourceCategory=', r.resourceCategory);
      console.log('freeResourceId =', r.freeResourceId?._id?.toString() || r.freeResourceId);
      if (r.freeResourceId) {
        console.log('Linked FreeResource publishStatus =', r.freeResourceId.publishStatus, 'isPublished=', r.freeResourceId.isPublished, 'isActive=', r.freeResourceId.isActive, 'resourceType=', r.freeResourceId.resourceType);
      }
    } catch (e) {
      console.error('Error checking id', id, e.message);
    }
  }

  const publishedFreeCount = await FreeResource.countDocuments({ publishStatus: 'published' });
  console.log('\nTotal FreeResources with publishStatus=published:', publishedFreeCount);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});