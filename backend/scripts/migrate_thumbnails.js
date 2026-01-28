import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Resource from '../models/Resource.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_BUCKET_ID) {
      console.error('Appwrite env vars missing, aborting migration');
      process.exit(1);
    }

    const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
    const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;

    const cursor = Resource.find({ thumbnail: { $regex: '^/api/upload/thumbnail/' } }).cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const thumb = doc.thumbnail;
      const parts = thumb.split('/');
      const fileId = parts[parts.length - 1];
      const newUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
      doc.thumbnail = newUrl;
      await doc.save();
      count++;
      console.log('Updated', doc._id.toString(), '->', newUrl);
    }

    console.log('Migration complete, updated', count, 'documents');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

run();
