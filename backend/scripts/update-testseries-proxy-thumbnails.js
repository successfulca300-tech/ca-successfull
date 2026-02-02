import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TestSeries from '../models/TestSeries.js';
import TestSeriesMedia from '../models/TestSeriesMedia.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_ORIGIN || 'https://ca-successfull-production.up.railway.app';

async function toProxyUrl(fileUrl) {
  if (!fileUrl) return null;
  return `${BACKEND_URL.replace(/\/$/, '')}/api/files/public?fileUrl=${encodeURIComponent(fileUrl)}`;
}

async function findBestThumbnailFor(seriesDoc) {
  // Prefer seriesDoc.thumbnail if it's an Appwrite URL
  if (seriesDoc.thumbnail && /\/storage\/buckets\//.test(seriesDoc.thumbnail)) return seriesDoc.thumbnail;

  // Else, look for latest active TestSeriesMedia for this series
  const media = await TestSeriesMedia.findOne({ testSeriesId: seriesDoc._id.toString(), mediaType: 'image', status: 'active' }).sort({ createdAt: -1 }).lean();
  if (media && media.fileUrl) return media.fileUrl;

  // Nothing found
  return null;
}

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const seriesList = await TestSeries.find({ seriesType: { $in: ['S1', 'S2'] } });
  if (!seriesList || seriesList.length === 0) {
    console.log('No S1/S2 TestSeries found');
    await mongoose.disconnect();
    return;
  }

  for (const s of seriesList) {
    console.log(`Processing ${s.seriesType} (${s._id}) title='${s.title}'`);
    const best = await findBestThumbnailFor(s);
    if (!best) {
      console.log('  No candidate thumbnail found; skipping');
      continue;
    }

    const proxied = await toProxyUrl(best);

    if (s.thumbnail === proxied) {
      console.log('  Already proxied - no change');
      continue;
    }

    s.thumbnail = proxied;
    await s.save();
    console.log('  Updated thumbnail to proxied URL:', proxied);
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});