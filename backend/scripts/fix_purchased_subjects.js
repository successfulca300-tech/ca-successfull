import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Enrollment from '../models/Enrollment.js';
import TestSeries from '../models/TestSeries.js';

dotenv.config({ path: './backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all test series enrollments with paid status and empty purchasedSubjects
    const enrollmentsToFix = await Enrollment.find({
      testSeriesId: { $exists: true, $ne: null },
      paymentStatus: 'paid',
      $or: [
        { purchasedSubjects: { $exists: false } },
        { purchasedSubjects: { $size: 0 } }
      ]
    });

    console.log(`❌ Found ${enrollmentsToFix.length} test series enrollments with empty purchasedSubjects`);

    for (const enrollment of enrollmentsToFix) {
      let subjectsToSet = [];

      // Try to get subjects from TestSeries if testSeriesId is ObjectId
      if (enrollment.testSeriesId && mongoose.Types.ObjectId.isValid(enrollment.testSeriesId)) {
        try {
          const testSeries = await TestSeries.findById(enrollment.testSeriesId, 'subjects title');
          if (testSeries && testSeries.subjects && testSeries.subjects.length > 0) {
            subjectsToSet = testSeries.subjects;
          }
        } catch (err) {
          console.warn(`Could not find TestSeries for ${enrollment.testSeriesId}: ${err.message}`);
        }
      }

      // If no subjects found, default to all subjects
      if (subjectsToSet.length === 0) {
        subjectsToSet = ['FR', 'AFM', 'Audit', 'DT', 'IDT'];
      }

      enrollment.purchasedSubjects = subjectsToSet;
      await enrollment.save();
      console.log(`  ✅ Updated enrollment ${enrollment._id.toString().slice(-6)}: set purchasedSubjects to ${subjectsToSet.join(', ')}`);
    }

    console.log(`✅ Successfully updated ${enrollmentsToFix.length} enrollments`);

    // Verification
    const stillEmpty = await Enrollment.countDocuments({
      testSeriesId: { $exists: true, $ne: null },
      paymentStatus: 'paid',
      $or: [
        { purchasedSubjects: { $exists: false } },
        { purchasedSubjects: { $size: 0 } }
      ]
    });

    if (stillEmpty === 0) {
      console.log('✅ SUCCESS: All test series enrollments now have purchasedSubjects set!');
    } else {
      console.log(`⚠️  WARNING: ${stillEmpty} enrollments still have empty purchasedSubjects`);
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
