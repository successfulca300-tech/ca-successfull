import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Resource from '../models/Resource.js';
import FreeResource from '../models/FreeResource.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI (or MONGO_URI) not set in .env or environment');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined });
  console.log('Connected to MongoDB');

  // Publish Resource docs where resourceCategory=notes and price==0
  const resourcesToPublish = await Resource.find({ resourceCategory: 'notes', price: 0, status: { $ne: 'published' } });
  console.log('Resources to publish (price 0):', resourcesToPublish.length);
  for (const r of resourcesToPublish) {
    try {
      r.status = 'published';
      r.isPublic = true;
      r.isActive = true;
      await r.save();
      console.log('Published Resource', r._id.toString());
    } catch (e) {
      console.error('Failed to publish Resource', r._id.toString(), e.message);
    }
  }

  // Ensure linked FreeResource docs are published
  const resourcesWithFree = await Resource.find({ freeResourceId: { $exists: true, $ne: null } }).populate('freeResourceId');
  let updatedFreeCount = 0;
  for (const r of resourcesWithFree) {
    const fr = r.freeResourceId;
    if (!fr) continue;
    if (fr.publishStatus !== 'published' || fr.isPublished !== true) {
      try {
        await FreeResource.findByIdAndUpdate(fr._id, { publishStatus: 'published', isPublished: true, isActive: true });
        updatedFreeCount++;
        console.log('Published FreeResource', fr._id.toString());
      } catch (e) {
        console.error('Failed to publish FreeResource', fr._id.toString(), e.message);
      }
    }
  }

  console.log('Completed. Resources published:', resourcesToPublish.length, 'FreeResources updated:', updatedFreeCount);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });