import dotenv from 'dotenv';

dotenv.config();

const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;

if (!APPWRITE_API_KEY || !APPWRITE_PROJECT_ID) {
  console.error('Appwrite env missing');
  process.exit(1);
}

// Paste a file URL to test (replace with one printed earlier if needed)
const fileUrl = process.argv[2] || 'https://nyc.cloud.appwrite.io/v1/storage/buckets/693adb15001787a85335/files/image_1770039791956_o561g3/view?project=693adacb003d93b08315';

(async () => {
  try {
    const res = await fetch(fileUrl, {
      headers: {
        'X-Appwrite-Key': APPWRITE_API_KEY,
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
    });

    console.log('Status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    if (!res.ok) {
      const txt = await res.text();
      console.error('Failed, detail:', txt.slice(0, 500));
      process.exit(1);
    }

    const buffer = await res.arrayBuffer();
    console.log('Bytes received:', buffer.byteLength);
    process.exit(0);
  } catch (err) {
    console.error('Fetch error:', err.message);
    process.exit(1);
  }
})();