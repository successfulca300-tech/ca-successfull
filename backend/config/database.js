import mongoose from 'mongoose';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connectWithRetry(uri, options = {}, retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, options);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${delayMs}ms...`);
        await wait(delayMs);
        delayMs *= 2; // exponential backoff
      } else {
        // let the caller decide how to handle a final failure
        throw err;
      }
    }
  }
}

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-successful';
  // Use sensible defaults; caller will handle failures
  return connectWithRetry(mongoURI, { /* keep mongoose defaults */ }, 5, 3000);
};

export default connectDB;

