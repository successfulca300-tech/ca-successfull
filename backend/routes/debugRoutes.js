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

export default router;
