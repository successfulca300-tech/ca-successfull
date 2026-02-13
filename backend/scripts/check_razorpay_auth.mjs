import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env relative to this script file so it works regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    console.log('Loaded RAZORPAY_KEY_ID:', keyId ? `${String(keyId).slice(0,8)}...` : null);
    if (!keyId || !keySecret) {
      console.error('Razorpay keys missing in environment (backend/.env)');
      process.exit(1);
    }

    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const options = { amount: 100, currency: 'INR', receipt: `test_rcpt_${Date.now()}` };
    console.log('Creating test order with Razorpay...');
    const order = await instance.orders.create(options);
    console.log('Razorpay order created:', order);
    process.exit(0);
  } catch (err) {
    console.error('Razorpay test error:', err);
    if (err && err.error) {
      try { console.error('Error details:', JSON.stringify(err.error)); } catch (e) {}
    }
    process.exit(2);
  }
})();
