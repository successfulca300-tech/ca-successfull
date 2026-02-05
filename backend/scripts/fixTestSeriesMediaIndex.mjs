import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TestSeriesMedia from '../models/TestSeriesMedia.js';

dotenv.config({ path: '../.env' });

let MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

// If the connection string doesn't specify a database (e.g., ends with '/?appName=...'),
// add a default database name to avoid Mongo driver parsing errors.
if (MONGO_URI && /\/\?/.test(MONGO_URI)) {
  console.warn('MONGO_URI appears to lack a database name; adding default DB "test" for migration');
  MONGO_URI = MONGO_URI.replace('/?', '/test?');
}

// Some connection strings may include an `appName` query parameter which the driver
// may reject if it's malformed. Remove `appName` param entirely for migration to
// avoid parsing errors (no secrets leaked in logs).
if (/appName=/i.test(MONGO_URI)) {
  console.warn('Stripping potentially problematic `appName` query parameter from MONGO_URI for migration');
  MONGO_URI = MONGO_URI.replace(/(\?appName=[^&]*)/i, '').replace(/(&appName=[^&]*)/i, '');
  // Remove trailing '?' or '&' left behind
  MONGO_URI = MONGO_URI.replace(/[?&]$/,'');
}

// Debug: print masked/sanitized URI for troubleshooting (do not leak credentials)
try {
  const masked = MONGO_URI.replace(/(\/\/)([^:@]+)(:[^@]+)?@/, '$1****@');
  console.log('Using Mongo URI (masked):', masked);
} catch (e) {
  console.warn('Could not mask Mongo URI for logging');
}

async function run() {
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  console.log('Connected to MongoDB');

  const collection = TestSeriesMedia.collection;

  // List current indexes
  const indexes = await collection.indexes();
  console.log('Existing indexes:', indexes.map(i => ({ name: i.name, key: i.key, unique: !!i.unique })));

  const badIndexName = 'testSeriesId_1_mediaType_1_status_1';
  const badIndex = indexes.find(i => i.name === badIndexName);

  if (badIndex) {
    console.log(`Found bad index ${badIndexName}, dropping it...`);
    try {
      await collection.dropIndex(badIndexName);
      console.log(`Dropped index ${badIndexName}`);
    } catch (err) {
      console.error(`Failed to drop index ${badIndexName}:`, err.message);
    }
  } else {
    console.log(`Index ${badIndexName} not found, nothing to drop.`);
  }

  // Ensure correct partial unique index exists for published media
  const desiredIndexName = 'testSeriesId_1_mediaType_1_published_unique';
  const existingDesired = indexes.find(i => i.key && i.key.testSeriesId && i.key.mediaType && i.partialFilterExpression && i.partialFilterExpression.status === 'published');

  if (!existingDesired) {
    console.log('Creating partial unique index for published media...');
    try {
      await collection.createIndex(
        { testSeriesId: 1, mediaType: 1 },
        { unique: true, partialFilterExpression: { status: 'published' }, name: desiredIndexName }
      );
      console.log('Created partial unique index for published media');
    } catch (err) {
      console.error('Failed to create desired partial unique index:', err.message);
    }
  } else {
    console.log('Partial unique index for published media already exists.');
  }

  await mongoose.disconnect();
  console.log('Disconnected. Migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});