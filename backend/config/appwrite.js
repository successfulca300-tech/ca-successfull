import { Client, Storage } from 'node-appwrite';

// Initialize Appwrite client only when needed (lazy initialization)
let storage = null;

export function initializeAppwrite() {
  if (storage) return storage;
  
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

  console.log('APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT);
  console.log('APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID);
  console.log('APPWRITE_API_KEY:', APPWRITE_API_KEY?.substring(0, 20) + '...');

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    throw new Error('Appwrite configuration missing. Please check APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY environment variables.');
  }

  const client = new Client();
  
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  // Initialize Storage service
  storage = new Storage(client);
  
  return storage;
}

export { Storage };
