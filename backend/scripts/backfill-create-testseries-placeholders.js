import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TestSeries from '../models/TestSeries.js';
import TestSeriesMedia from '../models/TestSeriesMedia.js';
import TestSeriesPaper from '../models/TestSeriesPaper.js';
import Category from '../models/Category.js';
import Enrollment from '../models/Enrollment.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-successfull';

const shorthandList = ['s1', 's2', 's3', 's4'];

async function ensureCategory() {
  let cat = await Category.findOne({ slug: 'auto-testseries' });
  if (!cat) {
    cat = await Category.create({ name: 'Auto TestSeries Category', slug: 'auto-testseries', description: 'Auto-created category for placeholder TestSeries' });
  }
  return cat;
}

async function createIfMissing(shorthand) {
  const seriesType = shorthand.toUpperCase();
  const existing = await TestSeries.findOne({ seriesType });
  if (existing) return existing;

  const category = await ensureCategory();

  const labels = { 'S1': 'Full Syllabus', 'S2': '50% Syllabus', 'S3': '30% Syllabus', 'S4': 'CA Successful Specials' };

  const placeholder = await TestSeries.create({
    title: `${seriesType} Test Series (Auto-created)`,
    description: `Auto-created placeholder for ${seriesType}`,
    seriesType,
    seriesTypeLabel: labels[seriesType] || 'Full Syllabus',
    category: category._id,
    pricing: {},
    subjects: ['FR','AFM','Audit','DT','IDT'],
    createdBy: null,
    publishStatus: 'published',
    isActive: true,
  });

  console.log(`Created placeholder TestSeries ${seriesType}: ${placeholder._id}`);
  return placeholder;
}

async function migrate() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', MONGODB_URI);

  for (const shorthand of shorthandList) {
    const placeholder = await createIfMissing(shorthand);

    // Update media docs
    const mediaRes = await TestSeriesMedia.updateMany({ testSeriesId: shorthand }, { $set: { testSeriesId: placeholder._id.toString() } });
    console.log(`Updated ${mediaRes.modifiedCount || mediaRes.nModified || 0} media docs from ${shorthand} -> ${placeholder._id}`);

    // Update paper docs
    const paperRes = await TestSeriesPaper.updateMany({ testSeriesId: shorthand }, { $set: { testSeriesId: placeholder._id.toString() } });
    console.log(`Updated ${paperRes.modifiedCount || paperRes.nModified || 0} paper docs from ${shorthand} -> ${placeholder._id}`);

    // Update enrollments that referenced shorthand testSeriesId
    try {
      const enrollRes = await Enrollment.updateMany({ testSeriesId: shorthand }, { $set: { testSeriesId: placeholder._id.toString() } });
      console.log(`Updated ${enrollRes.modifiedCount || enrollRes.nModified || 0} enrollments from ${shorthand} -> ${placeholder._id}`);
    } catch (e) {
      console.warn('Failed to update enrollments for', shorthand, e.message);
    }

    // Optionally set placeholder thumbnail from latest active media
    const latestMedia = await TestSeriesMedia.findOne({ testSeriesId: placeholder._id.toString(), status: 'active' }).sort({ createdAt: -1 });
    if (latestMedia) {
      placeholder.thumbnail = latestMedia.fileUrl;
      await placeholder.save();
      console.log(`Set thumbnail for ${placeholder._id} from media ${latestMedia._id}`);
    }
  }

  await mongoose.disconnect();
  console.log('Migration completed');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
