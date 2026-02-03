import Razorpay from 'razorpay';
import crypto from 'crypto';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import TestSeries from '../models/TestSeries.js';
import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/payments/create-order
export const createOrder = async (req, res) => {
  try {
    const { courseId, testSeriesId, bookId, amount, purchasedSubjects } = req.body;
    console.log('[Payment] createOrder called with:', { testSeriesId, amount, purchasedSubjects });
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    // Determine resource type
    const resourceType = courseId ? 'course' : testSeriesId ? 'testseries' : bookId ? 'book' : null;
    const resourceId = courseId || testSeriesId || bookId;
    if (!resourceType || !resourceId || amount === undefined) return res.status(400).json({ message: 'resource id and amount required' });

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    // Validate resource exists
    if (resourceType === 'course') {
      const course = await Course.findById(resourceId);
      if (!course) return res.status(404).json({ message: 'Course not found' });
    } else if (resourceType === 'testseries') {
      // Try to find testSeries for validation, but don't fail if not found (may be shorthand)
      let testSeries = null;
      if (mongoose.Types.ObjectId.isValid(resourceId)) {
        testSeries = await TestSeries.findById(resourceId);
      }
      if (!testSeries) {
        const seriesType = resourceId.toUpperCase();
        testSeries = await TestSeries.findOne({ seriesType });
      }
      console.log('[Payment] TestSeries lookup:', testSeries ? `Found: ${testSeries.title}` : `Using provided ID as-is: ${resourceId}`);
    } else if (resourceType === 'book') {
      const bk = await Book.findById(resourceId);
      if (!bk) return res.status(404).json({ message: 'Book not found' });
    }

    // Create pending enrollment - NORMALIZE testSeriesId for consistency
    const createObj = {
      userId: req.user._id,
      paymentStatus: 'pending',
      amount,
    };
    if (resourceType === 'course') createObj.courseId = resourceId;
    if (resourceType === 'testseries') {
      // Normalize shorthand IDs to lowercase for consistency with paper storage
      // If it looks like a shorthand (s1, s2, etc), normalize to lowercase
      let normalizedTestSeriesId = resourceId;
      if (resourceId && typeof resourceId === 'string' && !mongoose.Types.ObjectId.isValid(resourceId)) {
        // It's not an ObjectId, so it's likely shorthand - normalize to lowercase
        normalizedTestSeriesId = resourceId.toLowerCase();
      }
      
      createObj.testSeriesId = normalizedTestSeriesId;
      console.log('[Payment] Storing testSeriesId in enrollment:', normalizedTestSeriesId, '(original was:', resourceId, ')');
      
      if (purchasedSubjects && Array.isArray(purchasedSubjects) && purchasedSubjects.length > 0) {
        createObj.purchasedSubjects = purchasedSubjects;
        console.log('[Payment] Saving purchasedSubjects to enrollment:', purchasedSubjects);
      } else {
        console.log('[Payment] WARNING: No purchasedSubjects received or invalid format');
      }
    }
    if (resourceType === 'book') createObj.bookId = resourceId;

    const enrollment = await Enrollment.create(createObj);
    console.log('[Payment] Enrollment created:', { 
      id: enrollment._id, 
      testSeriesId: enrollment.testSeriesId,
      purchasedSubjects: enrollment.purchasedSubjects,
      paymentStatus: enrollment.paymentStatus 
    });

    const instance = getRazorpayInstance();
    if (!instance) {
      // Do not crash when keys are missing; return helpful error so developer can configure .env
      console.error('Razorpay keys not configured');
      return res.status(500).json({ message: 'Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env' });
    }

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${enrollment._id}`,
      notes: { enrollmentId: enrollment._id.toString(), resourceType, resourceId: resourceId.toString(), userId: req.user._id.toString() },
    };

    const order = await instance.orders.create(options);

    return res.json({ mode: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, order, enrollmentId: enrollment._id });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ message: 'Unable to create order', error: err.message });
  }
};

// POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, enrollmentId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !enrollmentId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    console.log('[Payment] Enrollment before payment update:', { 
      id: enrollment._id, 
      purchasedSubjects: enrollment.purchasedSubjects,
      paymentStatus: enrollment.paymentStatus 
    });

    enrollment.paymentStatus = 'paid';
    enrollment.paymentId = razorpay_payment_id;
    enrollment.transactionDate = new Date();
    await enrollment.save();

    console.log('[Payment] Enrollment after payment update:', { 
      id: enrollment._id, 
      purchasedSubjects: enrollment.purchasedSubjects,
      paymentStatus: enrollment.paymentStatus 
    });

    // Optionally increment course enrollment count
    try {
      if (enrollment.courseId) {
        await Course.findByIdAndUpdate(enrollment.courseId, { $inc: { enrollmentCount: 1 } });
      }
      if (enrollment.testSeriesId) {
        try { await TestSeries.findByIdAndUpdate(enrollment.testSeriesId, { $inc: { enrollmentCount: 1 } }); } catch (e) { console.warn('Failed to increment testseries count', e.message); }
      }
      if (enrollment.bookId) {
        try { await Book.findByIdAndUpdate(enrollment.bookId, { $inc: { purchasesCount: 1 } }); } catch (e) { console.warn('Failed to increment book purchases count', e.message); }
      }
    } catch (e) {
      console.warn('Failed to increment resource counts', e.message);
    }

    // Remove the enrolled course from user's cart if it exists
    try {
      if (enrollment.courseId) {
        const cart = await Cart.findOne({ user: enrollment.userId });
        if (cart) {
          cart.items = cart.items.filter(item => item.courseId.toString() !== enrollment.courseId.toString());
          await cart.save();
        }
      }
    } catch (e) {
      console.warn('Failed to remove course from cart:', e.message);
    }

    return res.json({ success: true, message: 'Payment verified and enrollment updated' });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};
