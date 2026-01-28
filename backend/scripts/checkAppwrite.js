import dotenv from 'dotenv';
import { Client, Storage } from 'node-appwrite';

dotenv.config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('Appwrite configuration missing in .env (endpoint/project/key)');
  process.exit(1);
}

if (!APPWRITE_BUCKET_ID) {
  console.error('APPWRITE_BUCKET_ID not set in .env');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

const run = async () => {
  try {
    console.log('Checking Appwrite bucket connectivity...');
    // Try to list files in the bucket as a connectivity check
    const res = await storage.listFiles(APPWRITE_BUCKET_ID);
    console.log('Success: connected to Appwrite.');
    console.log(`Files in bucket (${APPWRITE_BUCKET_ID}) — count: ${res.total || (res.files && res.files.length) || 'unknown'}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect to Appwrite or list files in bucket:', err.message || err);
    process.exit(2);
  }
};

run();
