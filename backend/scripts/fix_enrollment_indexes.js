import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collName = 'enrollments';
    const coll = db.collection(collName);

    const indexes = await coll.indexes();
    console.log('Existing indexes on enrollments:', indexes.map(i => i.name));

    const candidates = [
      'userId_1_courseId_1',
      'userId_1_testSeriesId_1',
      'userId_1_bookId_1',
    ];

    for (const name of candidates) {
      try {
        const idx = indexes.find(i => i.name === name);
        if (idx) {
          console.log('Dropping index:', name);
          await coll.dropIndex(name);
          console.log('Dropped', name);
        } else {
          console.log('Index not found, skipping:', name);
        }
      } catch (err) {
        console.error('Error dropping index', name, err.message || err);
      }
    }

    console.log('Index cleanup complete. Restart backend to recreate indexes via Mongoose.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
