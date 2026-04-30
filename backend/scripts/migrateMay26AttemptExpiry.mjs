import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Enrollment from '../models/Enrollment.js';
import TestSeries from '../models/TestSeries.js';
import { getAttemptExpiryDate, normalizeTestSeriesAttempt } from '../utils/testSeriesAttempt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const DB_NAME = process.env.MONGODB_DB_NAME || 'test';
if (MONGO_URI.includes('/?')) {
  MONGO_URI = MONGO_URI.replace('/?', `/${DB_NAME}?`);
}

const APPLY = process.argv.includes('--apply');
const TARGET_ATTEMPT = 'May 26';

const detectExamLevel = (enrollment, testSeriesDoc) => {
  const docLevel = String(testSeriesDoc?.examLevel || '').trim().toLowerCase();
  if (docLevel === 'inter' || docLevel === 'final') return docLevel;

  const fixedKeyHint = String(testSeriesDoc?.fixedKey || enrollment?.testSeriesId || '').trim().toLowerCase();
  if (fixedKeyHint.startsWith('inter-')) return 'inter';
  return 'final';
};

const run = async () => {
  const testSeriesCache = new Map();
  const nowIso = new Date().toISOString();

  try {
    await mongoose.connect(MONGO_URI, { autoIndex: false });
    console.log(`Connected to MongoDB (${mongoose.connection.host})`);
    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'} | Now: ${nowIso}`);

    const paidTestSeriesEnrollments = await Enrollment.find({
      paymentStatus: { $in: ['paid', 'completed'] },
      testSeriesId: { $exists: true, $ne: null },
    }).select('_id testSeriesId purchasedSubjects testSeriesAttempt expiryDate');

    let totalSeen = 0;
    let updated = 0;
    let skippedOtherAttempt = 0;
    let skippedNoChange = 0;
    let failed = 0;

    for (const enrollment of paidTestSeriesEnrollments) {
      totalSeen += 1;

      const currentAttempt = normalizeTestSeriesAttempt(enrollment.testSeriesAttempt);
      if (currentAttempt && currentAttempt !== TARGET_ATTEMPT) {
        skippedOtherAttempt += 1;
        continue;
      }

      const testSeriesIdRaw = enrollment.testSeriesId;
      const testSeriesIdStr = String(testSeriesIdRaw || '');
      let testSeriesDoc = null;
      if (mongoose.Types.ObjectId.isValid(testSeriesIdStr)) {
        if (!testSeriesCache.has(testSeriesIdStr)) {
          const found = await TestSeries.findById(testSeriesIdStr).select('examLevel fixedKey subjects');
          testSeriesCache.set(testSeriesIdStr, found || null);
        }
        testSeriesDoc = testSeriesCache.get(testSeriesIdStr);
      }

      const purchasedSubjects = Array.isArray(enrollment.purchasedSubjects) && enrollment.purchasedSubjects.length > 0
        ? enrollment.purchasedSubjects
        : Array.isArray(testSeriesDoc?.subjects)
          ? testSeriesDoc.subjects
          : [];

      const examLevel = detectExamLevel(enrollment, testSeriesDoc);
      const computedExpiryDate = getAttemptExpiryDate(TARGET_ATTEMPT, {
        purchasedSubjects,
        examLevel,
      });

      if (!computedExpiryDate) {
        failed += 1;
        console.warn(`Failed to compute expiry for enrollment ${enrollment._id}`);
        continue;
      }

      const alreadySameAttempt = currentAttempt === TARGET_ATTEMPT;
      const currentExpiryMs = enrollment.expiryDate ? new Date(enrollment.expiryDate).getTime() : null;
      const newExpiryMs = computedExpiryDate.getTime();
      const needsExpiryUpdate = currentExpiryMs !== newExpiryMs;
      const needsAttemptUpdate = !alreadySameAttempt;

      if (!needsExpiryUpdate && !needsAttemptUpdate) {
        skippedNoChange += 1;
        continue;
      }

      if (APPLY) {
        await Enrollment.updateOne(
          { _id: enrollment._id },
          {
            $set: {
              paymentStatus: 'paid',
              testSeriesAttempt: TARGET_ATTEMPT,
              expiryDate: computedExpiryDate,
            },
          }
        );
      }

      updated += 1;
      console.log(
        `${APPLY ? 'Updated' : 'Would update'} enrollment ${enrollment._id} -> attempt ${TARGET_ATTEMPT}, expiry ${computedExpiryDate.toISOString()}`
      );
    }

    // Keep test-series submission schedule aligned with requested dates.
    const scheduleFilter = {
      'seriesDates.group2SubmissionDate': { $regex: /30(?:st|nd|rd|th)?\s+April\s+2026/i },
      'seriesDates.group1SubmissionDate': { $regex: /25(?:st|nd|rd|th)?\s+April\s+2026/i },
    };

    const scheduleDocs = await TestSeries.find(scheduleFilter).select('_id title seriesDates.group1SubmissionDate');
    if (scheduleDocs.length > 0) {
      if (APPLY) {
        await TestSeries.updateMany(scheduleFilter, {
          $set: { 'seriesDates.group1SubmissionDate': '26th April 2026' },
        });
      }

      console.log(
        `${APPLY ? 'Updated' : 'Would update'} ${scheduleDocs.length} test series docs: group1SubmissionDate -> 26th April 2026`
      );
    }

    console.log('\nMigration summary');
    console.log(`Seen paid test-series enrollments: ${totalSeen}`);
    console.log(`${APPLY ? 'Updated' : 'Would update'} enrollments: ${updated}`);
    console.log(`Skipped (other attempt already set): ${skippedOtherAttempt}`);
    console.log(`Skipped (already correct): ${skippedNoChange}`);
    console.log(`Failed: ${failed}`);
    console.log(`Schedule docs matched: ${scheduleDocs.length}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

run();
