import dotenv from 'dotenv';
dotenv.config();

import sendOTPEmail from '../utils/email.js';

const recipient = process.argv[2] || process.env.TEST_EMAIL;
if (!recipient) {
  console.error('Usage: node scripts/test_send_email.js <recipient-email>  OR set TEST_EMAIL in env');
  process.exit(1);
}

const otp = Math.floor(100000 + Math.random() * 900000).toString();

sendOTPEmail(recipient, otp)
  .then(info => {
    console.log('Test email sent successfully:', info && info.messageId ? info.messageId : info);
    process.exit(0);
  })
  .catch(err => {
    console.error('Test email failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
