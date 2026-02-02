import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TestSeries from '../models/TestSeries.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const series = await TestSeries.find({ seriesType: { $in: ['S1', 'S2', 'S3', 'S4'] } }).select('title seriesType thumbnail _id createdAt updatedAt').lean();

  if (!series || series.length === 0) {
    console.log('No TestSeries documents for S1..S4 found');
  } else {
    for (const s of series) {
      console.log(`- ${s.seriesType} | ${s.title} | id=${s._id}`);
      console.log(`  thumbnail: ${s.thumbnail}`);
      console.log(`  createdAt: ${s.createdAt} updatedAt: ${s.updatedAt}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});