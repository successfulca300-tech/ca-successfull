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
    const { courseId, mentorshipId, testSeriesId, bookId, amount, purchasedSubjects, mentorshipPapers } = req.body;
    console.log('[Payment] createOrder called with:', { mentorshipId, mentorshipPapers, testSeriesId, amount, purchasedSubjects });
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role === 'admin' || req.user.role === 'subadmin') {
      return res.status(403).json({ message: 'Admins and sub-admins cannot purchase' });
    }

    // Determine resource type
    const resourceType = courseId ? 'course' : mentorshipId ? 'mentorship' : testSeriesId ? 'testseries' : bookId ? 'book' : null;
    const resourceId = courseId || mentorshipId || testSeriesId || bookId;
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
    } else if (resourceType === 'mentorship') {
      const validMentorshipPlans = new Set(['mentorship_basic_01', 'mentorship_golden_02', 'mentorship_platinum_03']);
      if (!validMentorshipPlans.has(String(resourceId))) {
        return res.status(400).json({ message: 'Invalid mentorship plan selected' });
      }
    }

    // Reuse existing enrollment if already created for this resource.
    const enrollmentQuery = { userId: req.user._id };
    if (resourceType === 'course') enrollmentQuery.courseId = resourceId;
    if (resourceType === 'mentorship') enrollmentQuery.mentorshipId = String(resourceId);
    if (resourceType === 'book') enrollmentQuery.bookId = resourceId;
    if (resourceType === 'testseries') {
      let normalizedTestSeriesId = resourceId;
      if (resourceId && typeof resourceId === 'string' && !mongoose.Types.ObjectId.isValid(resourceId)) {
        normalizedTestSeriesId = resourceId.toLowerCase();
      }
      enrollmentQuery.testSeriesId = normalizedTestSeriesId;
    }

    let enrollment = await Enrollment.findOne(enrollmentQuery);
    if (enrollment && enrollment.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'You have already purchased this plan/resource.' });
    }

    // Create/update pending enrollment - NORMALIZE testSeriesId for consistency
    const createObj = {
      paymentStatus: 'pending',
      amount,
    };
    if (resourceType === 'course') createObj.courseId = resourceId;
    if (resourceType === 'mentorship') {
      createObj.mentorshipId = String(resourceId);
      // Store mentorship papers if provided
      if (mentorshipPapers && Array.isArray(mentorshipPapers) && mentorshipPapers.length > 0) {
        createObj.mentorshipPapers = mentorshipPapers;
        console.log('[Payment] Saving mentorshipPapers to enrollment:', mentorshipPapers);
      }
    }
    if (resourceType === 'testseries') {
      // Prefer storing DB ObjectId if TestSeries exists, else fall back to normalized shorthand string
      let storeTestSeriesId = resourceId;
      let testSeriesRecord = null;
      if (mongoose.Types.ObjectId.isValid(resourceId)) {
        testSeriesRecord = await TestSeries.findById(resourceId);
      }
      if (!testSeriesRecord) {
        const st = String(resourceId || '').toUpperCase();
        if (['S1','S2','S3','S4'].includes(st)) {
          testSeriesRecord = await TestSeries.findOne({ seriesType: st });
        }
      }

      if (testSeriesRecord) {
        storeTestSeriesId = testSeriesRecord._id;
      } else if (resourceId && typeof resourceId === 'string' && !mongoose.Types.ObjectId.isValid(resourceId)) {
        // Normalize to lowercase shorthand for legacy compatibility
        storeTestSeriesId = resourceId.toLowerCase();
      }

      createObj.testSeriesId = storeTestSeriesId;
      console.log('[Payment] Storing testSeriesId in enrollment:', storeTestSeriesId, '(resolved record id:', testSeriesRecord?._id || null, ')');

      if (purchasedSubjects && Array.isArray(purchasedSubjects) && purchasedSubjects.length > 0) {
        createObj.purchasedSubjects = purchasedSubjects;
        console.log('[Payment] Saving purchasedSubjects to enrollment:', purchasedSubjects);
      } else {
        console.log('[Payment] WARNING: No purchasedSubjects received or invalid format');
      }
    }
    if (resourceType === 'book') createObj.bookId = resourceId;

    if (!enrollment) {
      enrollment = await Enrollment.create({
        userId: req.user._id,
        ...createObj,
      });
    } else {
      Object.assign(enrollment, createObj);
      await enrollment.save();
    }

    console.log('[Payment] Enrollment created:', { 
      id: enrollment._id, 
      mentorshipId: enrollment.mentorshipId,
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
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'You have already initiated/purchased this plan/resource.' });
    }
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
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: 'Razorpay secret is not configured' });
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
    if (enrollment.testSeriesId && !enrollment.expiryDate) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60);
      enrollment.expiryDate = expiryDate;
    }
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
