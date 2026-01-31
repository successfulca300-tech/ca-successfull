import express from 'express';
import sendOTPEmail from '../utils/email.js';

const router = express.Router();

// Protected debug route to send a test OTP email
// Requires header: x-debug-key: <DEBUG_EMAIL_KEY env value>
router.post('/send', async (req, res) => {
  const key = req.headers['x-debug-key'];
  if (!process.env.DEBUG_EMAIL_KEY || key !== process.env.DEBUG_EMAIL_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { email, otp } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required in body' });

  const code = otp || Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const info = await sendOTPEmail(email, code);
    return res.json({ message: 'Test email sent', info });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send test email', error: err && err.message ? err.message : err });
  }
});

// Appwrite connectivity debug
// Requires header: x-debug-key: <DEBUG_EMAIL_KEY env value>
router.get('/appwrite', async (req, res) => {
  const key = req.headers['x-debug-key'];
  if (!process.env.DEBUG_EMAIL_KEY || key !== process.env.DEBUG_EMAIL_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { initializeAppwrite } = await import('../config/appwrite.js');
    const storage = initializeAppwrite();
    // Attempt to get bucket information
    const bucketId = process.env.APPWRITE_BUCKET_ID || process.env.APPWRITE_PAPERS_BUCKET_ID;
    const bucket = await storage.getBucket(bucketId);
    return res.json({ message: 'Appwrite connectivity OK', bucket });
  } catch (err) {
    console.error('Appwrite debug error:', err);
    const response = err && err.response ? err.response : undefined;
    return res.status(500).json({ message: 'Appwrite connectivity failed', error: err.message, response });
  }
});

// Environment presence debug (masked values)
router.get('/env', (req, res) => {
  const key = req.headers['x-debug-key'];
  if (!process.env.DEBUG_EMAIL_KEY || key !== process.env.DEBUG_EMAIL_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const mask = (v) => (v ? `${v.slice(0, 6)}...len=${v.length}` : 'missing');
  return res.json({
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'missing',
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID ? process.env.APPWRITE_PROJECT_ID : 'missing',
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY ? mask(process.env.APPWRITE_API_KEY) : 'missing',
    APPWRITE_BUCKET_ID: process.env.APPWRITE_BUCKET_ID ? process.env.APPWRITE_BUCKET_ID : 'missing',
  });
});

export default router;
