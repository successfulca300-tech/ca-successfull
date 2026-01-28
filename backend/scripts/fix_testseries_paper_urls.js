import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TestSeriesPaper from '../models/TestSeriesPaper.js';
import { generatePublicFileUrl } from '../utils/appwriteFileService.js';

dotenv.config({ path: './backend/.env' });

const generateNewFileId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // STEP 1: Find papers with invalid appwriteFileId
    console.log('\n📋 STEP 1: Searching for papers with invalid appwriteFileId...');
    const invalidPapers = await TestSeriesPaper.find({
      appwriteFileId: 'unique()'
    });

    console.log(`❌ Found ${invalidPapers.length} papers with appwriteFileId = 'unique()'`);

    for (const paper of invalidPapers) {
      const newFileId = generateNewFileId();
      paper.appwriteFileId = newFileId;
      paper.publicFileUrl = generatePublicFileUrl(newFileId);
      await paper.save();
      console.log(`  ✅ Updated paper ${paper._id.toString().slice(-6)}: ${paper.fileName} → ${newFileId}`);
    }

    // STEP 2: Find papers with malformed URLs containing unique()
    console.log('\n📋 STEP 2: Searching for papers with malformed publicFileUrl...');
    const papersWithMalformedUrls = await TestSeriesPaper.find({
      publicFileUrl: { $regex: 'unique\\(\\)' }
    });

    console.log(`❌ Found ${papersWithMalformedUrls.length} papers with 'unique()' in publicFileUrl`);

    for (const paper of papersWithMalformedUrls) {
      if (paper.appwriteFileId && paper.appwriteFileId !== 'unique()') {
        // Use existing valid fileId
        paper.publicFileUrl = generatePublicFileUrl(paper.appwriteFileId);
        await paper.save();
        console.log(`  ✅ Regenerated URL for paper ${paper._id.toString().slice(-6)}: ${paper.fileName}`);
      } else {
        // Generate new fileId if the existing one is also invalid
        const newFileId = generateNewFileId();
        paper.appwriteFileId = newFileId;
        paper.publicFileUrl = generatePublicFileUrl(newFileId);
        await paper.save();
        console.log(`  ✅ Created new ID and URL for paper ${paper._id.toString().slice(-6)}: ${paper.fileName} → ${newFileId}`);
      }
    }

    // STEP 3: Verification
    console.log('\n📋 STEP 3: Verifying all URLs are now valid...');
    const stillInvalidCount = await TestSeriesPaper.countDocuments({
      $or: [
        { appwriteFileId: 'unique()' },
        { publicFileUrl: { $regex: 'unique\\(\\)' } }
      ]
    });

    if (stillInvalidCount === 0) {
      console.log('✅ SUCCESS: All papers now have valid URLs!');
      console.log(`📊 Total papers fixed: ${invalidPapers.length + papersWithMalformedUrls.length}`);
    } else {
      console.log(`⚠️  WARNING: ${stillInvalidCount} papers still have invalid URLs`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

run();
