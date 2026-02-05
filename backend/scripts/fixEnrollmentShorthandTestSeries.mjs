import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Enrollment from '../models/Enrollment.js';
import TestSeries from '../models/TestSeries.js';

dotenv.config({ path: '../.env' });

let MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
// If URI includes '/?' (no DB name provided), add default DB
if (MONGO_URI && MONGO_URI.includes('/?')) {
  MONGO_URI = MONGO_URI.replace('/?', '/test?');
}
// Remove problematic appName param if present
if (/appName=/i.test(MONGO_URI)) {
  MONGO_URI = MONGO_URI.replace(/(\?appName=[^&]*)/i, '').replace(/(&appName=[^&]*)/i, '').replace(/[?&]$/,'');
}

async function run() {
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  console.log('Connected to MongoDB');

  const shorthands = ['s1','s2','s3','s4'];
  let totalUpdated = 0;

  for (const shorthand of shorthands) {
    const seriesType = shorthand.toUpperCase();
    const ts = await TestSeries.findOne({ seriesType });
    if (!ts) {
      console.log(`No TestSeries found for ${seriesType}, skipping.`);
      continue;
    }

    const enrollments = await Enrollment.find({ testSeriesId: shorthand });
    if (enrollments.length === 0) {
      console.log(`No enrollments with shorthand ${shorthand}`);
      continue;
    }

    console.log(`Found ${enrollments.length} enrollments with shorthand ${shorthand}, updating to ${ts._id}`);
    const res = await Enrollment.updateMany({ testSeriesId: shorthand }, { $set: { testSeriesId: ts._id } });
    console.log(`Modified count: ${res.modifiedCount}`);
    totalUpdated += res.modifiedCount || 0;
  }

  console.log(`Total enrollments updated: ${totalUpdated}`);
  await mongoose.disconnect();
  console.log('Disconnected. Migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});