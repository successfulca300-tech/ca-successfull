import { Client, Storage } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

// Upload file via multipart/form-data using multer -> this controller uploads to Appwrite
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { originalname, path: tempPath } = req.file;

    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      // Clean up temp file
      fs.unlinkSync(tempPath);
      return res.status(500).json({ message: 'Appwrite configuration missing' });
    }

    if (!APPWRITE_BUCKET_ID) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({ message: 'APPWRITE_BUCKET_ID must be set in .env' });
    }

    const client = new Client();
    client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(client);

    // Generate a unique fileId using timestamp
    const fileId = `file_${Date.now()}`;

    // Create read stream
    const readStream = fs.createReadStream(tempPath);

    // Upload the file to Appwrite bucket
    const response = await storage.createFile(APPWRITE_BUCKET_ID, fileId, readStream, originalname);

    // Remove temp file
    fs.unlinkSync(tempPath);

    // Build file URL (Appwrite file URLs follow /storage/buckets/{bucketId}/files/{fileId}/view)
    const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
    const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
    const fileUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    return res.status(201).json({ file: response, url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

export const getThumbnail = async (req, res) => {
  try {
    const { fileId } = req.params;
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
      return res.status(500).json({ message: 'Appwrite configuration missing' });
    }

    const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
    const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
    const url = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;

    // Fetch file from Appwrite using server API key
    const fetchRes = await fetch(url, {
      headers: {
        'X-Appwrite-Key': APPWRITE_API_KEY
      }
    });

    if (!fetchRes.ok) {
      const text = await fetchRes.text();
      console.error('Failed to fetch thumbnail from Appwrite:', fetchRes.status, text);
      return res.status(502).json({ message: 'Failed to retrieve thumbnail' });
    }

    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    console.error('getThumbnail error:', error);
    res.status(500).json({ message: 'Server error retrieving thumbnail' });
  }
};

// Public test upload endpoint: saves file locally under uploads/typed and returns accessible URL
// Uses req.files.file from express-fileupload (not multer)
export const testUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.file) return res.status(400).json({ message: 'No file provided' });

    let fileObj = req.files.file;
    if (Array.isArray(fileObj)) fileObj = fileObj[0];

    const originalname = fileObj.name || fileObj.originalname || fileObj.filename || 'upload';
    const tempPath = fileObj.tempFilePath || fileObj.tempPath || fileObj.path;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'typed');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}_${String(originalname || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const destPath = path.join(uploadsDir, safeName);

    // Move temp file to uploads/typed (rename will move across filesystem)
    try {
      fs.renameSync(tempPath, destPath);
    } catch (e) {
      // fallback to copy & unlink
      const data = fs.readFileSync(tempPath);
      fs.writeFileSync(destPath, data);
      try { fs.unlinkSync(tempPath); } catch (er) {}
    }

    const base = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
    const fileUrl = `${base}/uploads/typed/${encodeURIComponent(safeName)}`;

    return res.status(201).json({ message: 'Test upload saved', url: fileUrl, fileName: safeName });
  } catch (error) {
    console.error('testUpload error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ message: 'Test upload failed', error: error.message });
  }
};
