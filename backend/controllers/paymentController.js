import Razorpay from 'razorpay';
import crypto from 'crypto';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import TestSeries from '../models/TestSeries.js';
import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import {
  getAllowedTestSeriesAttempts,
  getAttemptSelectionHint,
  isAttemptAllowedForExamLevel,
  normalizeTestSeriesAttempt,
  getAttemptExpiryDate,
  isTestSeriesEnrollmentActive,
  isTestSeriesEnrollmentExpired,
} from '../utils/testSeriesAttempt.js';

const getSeriesTypeLabel = (seriesType, examLevel = 'final') => {
  if (seriesType === 'S1') return 'Full Syllabus';
  if (seriesType === 'S2') return '50% Syllabus';
  if (seriesType === 'S3') return examLevel === 'inter' ? 'Chapterwise' : '30% Syllabus';
  return 'CA Successful Specials';
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseFixedSeriesIdentifier = (value) => {
  const raw = String(value || '').trim();
  const lower = raw.toLowerCase();
  if (!lower) {
    return { raw, lower, seriesType: null, examLevel: 'final', fixedKey: null };
  }

  const parts = lower.split('-').filter(Boolean);
  const seriesToken = parts.length > 0 ? parts[parts.length - 1] : lower;
  const seriesType = ['s1', 's2', 's3', 's4'].includes(seriesToken) ? seriesToken.toUpperCase() : null;
  const examLevel = lower.startsWith('inter-') ? 'inter' : 'final';
  const fixedKey = seriesType ? lower : null;

  return { raw, lower, seriesType, examLevel, fixedKey };
};

const resolveTestSeriesFromIdentifier = async (identifier, options = {}) => {
  const { createIfMissing = false, createdBy = null } = options;
  const parsed = parseFixedSeriesIdentifier(identifier);
  let testSeries = null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    testSeries = await TestSeries.findById(identifier);
    if (testSeries) return { testSeries, parsed };
  }

  if (parsed.fixedKey) {
    testSeries = await TestSeries.findOne({
      fixedKey: { $regex: `^${escapeRegex(parsed.fixedKey)}$`, $options: 'i' },
    });
  }

  if (!testSeries && parsed.seriesType) {
    testSeries = await TestSeries.findOne({
      seriesType: parsed.seriesType,
      examLevel: parsed.examLevel,
    });
  }

  if (!testSeries && parsed.seriesType) {
    testSeries = await TestSeries.findOne({ seriesType: parsed.seriesType });
  }

  if (!testSeries && createIfMissing && parsed.seriesType) {
    testSeries = await TestSeries.create({
      fixedKey: parsed.fixedKey || undefined,
      title: `${parsed.examLevel === 'inter' ? 'CA Inter' : 'CA Final'} Test Series ${parsed.seriesType}`,
      seriesType: parsed.seriesType,
      seriesTypeLabel: getSeriesTypeLabel(parsed.seriesType, parsed.examLevel),
      examLevel: parsed.examLevel,
      category: null,
      createdBy: createdBy || null,
      publishStatus: 'published',
      isActive: true,
    });
  }

  return { testSeries, parsed };
};

const buildTestSeriesEnrollmentCandidates = (identifier, testSeries, parsed) => {
  const values = [];
  const normalizedInput = String(identifier || '').trim().toLowerCase();
  const isInterScoped = (parsed?.fixedKey || normalizedInput).startsWith('inter-');

  if (testSeries?._id) values.push(String(testSeries._id));
  if (normalizedInput) values.push(normalizedInput);
  if (parsed?.fixedKey) values.push(parsed.fixedKey);
  if (parsed?.seriesType && !isInterScoped) values.push(parsed.seriesType.toLowerCase(), parsed.seriesType);

  const unique = Array.from(new Set(values.filter(Boolean)));
  return unique.map((value) => {
    if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(value);
    return value;
  });
};

const normalizeSubjectToken = (value) => String(value || '').trim().toLowerCase();

const uniqueSubjectTokens = (subjects = []) => {
  if (!Array.isArray(subjects)) return [];
  return Array.from(
    new Set(
      subjects
        .map((subject) => String(subject || '').trim())
        .filter(Boolean)
    )
  );
};

const getUnpurchasedSubjects = (requestedSubjects = [], ownedSubjects = []) => {
  const requested = uniqueSubjectTokens(requestedSubjects);
  const ownedSet = new Set(
    uniqueSubjectTokens(ownedSubjects).map((subject) => normalizeSubjectToken(subject))
  );
  return requested.filter((subject) => !ownedSet.has(normalizeSubjectToken(subject)));
};

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/payments/create-order
export const createOrder = async (req, res) => {
  try {
    const {
      courseId,
      mentorshipId,
      testSeriesId,
      bookId,
      amount,
      purchasedSubjects,
      mentorshipPapers,
      testSeriesAttempt,
    } = req.body;
    console.log('[Payment] createOrder called with:', {
      mentorshipId,
      mentorshipPapers,
      testSeriesId,
      amount,
      purchasedSubjects,
      testSeriesAttempt,
    });
    
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role === 'admin' || req.user.role === 'subadmin') {
      return res.status(403).json({ message: 'Admins and sub-admins cannot purchase' });
    }

    // Determine resource type
    const resourceType = courseId ? 'course' : mentorshipId ? 'mentorship' : testSeriesId ? 'testseries' : bookId ? 'book' : null;
    const resourceId = courseId || mentorshipId || testSeriesId || bookId;
    if (!resourceType || !resourceId || amount === undefined) return res.status(400).json({ message: 'resource id and amount required' });
    let resolvedTestSeries = null;
    let parsedTestSeries = null;
    let normalizedTestSeriesAttempt = null;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    // Validate resource exists
    if (resourceType === 'course') {
      const course = await Course.findById(resourceId);
      if (!course) return res.status(404).json({ message: 'Course not found' });
    } else if (resourceType === 'testseries') {
      normalizedTestSeriesAttempt = normalizeTestSeriesAttempt(testSeriesAttempt);
      if (!normalizedTestSeriesAttempt) {
        const examLevel = resolvedTestSeries?.examLevel || parsedTestSeries?.examLevel || 'final';
        return res.status(400).json({
          message: `Attempt is required for test series purchase. Use upcoming ${getAttemptSelectionHint(examLevel)} values such as ${getAllowedTestSeriesAttempts(examLevel).join(', ')}.`,
        });
      }

      const resolved = await resolveTestSeriesFromIdentifier(resourceId, {
        createIfMissing: false,
      });
      resolvedTestSeries = resolved.testSeries;
      parsedTestSeries = resolved.parsed;
      const examLevel = resolvedTestSeries?.examLevel || parsedTestSeries?.examLevel || 'final';
      if (!isAttemptAllowedForExamLevel(normalizedTestSeriesAttempt, examLevel)) {
        return res.status(400).json({
          message: `Invalid attempt for this test series. Use upcoming ${getAttemptSelectionHint(examLevel)} values such as ${getAllowedTestSeriesAttempts(examLevel).join(', ')}.`,
        });
      }
      if (!resolvedTestSeries && !parsedTestSeries?.seriesType) {
        return res.status(404).json({ message: 'Test series not found' });
      }
      console.log(
        '[Payment] TestSeries lookup:',
        resolvedTestSeries
          ? `Found: ${resolvedTestSeries.title} (${resolvedTestSeries._id})`
          : `Using shorthand ID: ${String(resourceId || '').toLowerCase()}`
      );
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
      const candidates = buildTestSeriesEnrollmentCandidates(resourceId, resolvedTestSeries, parsedTestSeries);
      if (candidates.length > 1) {
        enrollmentQuery.$or = candidates.map((candidate) => ({ testSeriesId: candidate }));
      } else if (candidates.length === 1) {
        enrollmentQuery.testSeriesId = candidates[0];
      }
    }

    let enrollment = await Enrollment.findOne(enrollmentQuery);
    if (enrollment && resourceType === 'testseries' && resolvedTestSeries && String(enrollment.testSeriesId) !== String(resolvedTestSeries._id)) {
      // Normalize legacy shorthand rows to ObjectId where possible.
      const duplicate = await Enrollment.findOne({
        userId: req.user._id,
        testSeriesId: resolvedTestSeries._id,
        _id: { $ne: enrollment._id },
      });
      if (!duplicate) {
        enrollment.testSeriesId = resolvedTestSeries._id;
        await enrollment.save();
      }
    }

    const hasActiveTestSeriesEnrollment =
      resourceType === 'testseries' && enrollment && isTestSeriesEnrollmentActive(enrollment);
    const hasExpiredTestSeriesEnrollment =
      resourceType === 'testseries' && enrollment && isTestSeriesEnrollmentExpired(enrollment);

    if (hasActiveTestSeriesEnrollment && enrollment?.testSeriesAttempt) {
      const activeAttempt = normalizeTestSeriesAttempt(enrollment.testSeriesAttempt);
      if (activeAttempt && activeAttempt !== normalizedTestSeriesAttempt) {
        return res.status(409).json({
          message: `Current attempt (${activeAttempt}) is still active. You can buy the next attempt after expiry.`,
        });
      }
    }

    let testSeriesAddonPurchase = false;
    let testSeriesSubjectsToPurchase = uniqueSubjectTokens(purchasedSubjects);
    if (resourceType === 'testseries' && hasActiveTestSeriesEnrollment) {
      const alreadyPurchasedSubjects = uniqueSubjectTokens(enrollment.purchasedSubjects);
      // Legacy rows with empty purchasedSubjects mean full access was already bought.
      if (alreadyPurchasedSubjects.length === 0) {
        return res.status(409).json({ message: 'You have already purchased this plan/resource.' });
      }

      const unpurchasedSubjects = getUnpurchasedSubjects(
        testSeriesSubjectsToPurchase,
        alreadyPurchasedSubjects
      );

      if (unpurchasedSubjects.length === 0) {
        return res.status(409).json({ message: 'You have already purchased this plan/resource.' });
      }

      testSeriesAddonPurchase = true;
      testSeriesSubjectsToPurchase = unpurchasedSubjects;
      console.log('[Payment] Allowing test series add-on purchase for subjects:', testSeriesSubjectsToPurchase);
    }
    if (
      enrollment &&
      enrollment.paymentStatus === 'paid' &&
      !(resourceType === 'testseries' && (testSeriesAddonPurchase || hasExpiredTestSeriesEnrollment))
    ) {
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
      const storeTestSeriesId = resolvedTestSeries?._id || parsedTestSeries?.fixedKey || String(resourceId || '').toLowerCase();
      const subjectsForExpiry = testSeriesAddonPurchase
        ? uniqueSubjectTokens([
            ...(Array.isArray(enrollment?.purchasedSubjects) ? enrollment.purchasedSubjects : []),
            ...testSeriesSubjectsToPurchase,
          ])
        : testSeriesSubjectsToPurchase;
      const attemptExpiryDate = getAttemptExpiryDate(normalizedTestSeriesAttempt, {
        purchasedSubjects: subjectsForExpiry,
        examLevel: resolvedTestSeries?.examLevel || parsedTestSeries?.examLevel || null,
      });
      if (!attemptExpiryDate) {
        return res.status(400).json({ message: 'Invalid attempt selection for test series purchase' });
      }

      createObj.testSeriesId = storeTestSeriesId;
      createObj.testSeriesAttempt = normalizedTestSeriesAttempt;
      createObj.expiryDate = attemptExpiryDate;
      console.log('[Payment] Storing testSeriesId in enrollment:', storeTestSeriesId, '(resolved record id:', resolvedTestSeries?._id || null, ')');

      if (testSeriesAddonPurchase) {
        // Keep existing paid access intact; merge these only after successful payment verification.
        createObj.paymentStatus = 'paid';
        createObj.pendingPurchasedSubjects = testSeriesSubjectsToPurchase;
        console.log('[Payment] Saving pendingPurchasedSubjects to enrollment:', testSeriesSubjectsToPurchase);
      } else if (testSeriesSubjectsToPurchase.length > 0) {
        createObj.pendingPurchasedSubjects = [];
        createObj.purchasedSubjects = testSeriesSubjectsToPurchase;
        console.log('[Payment] Saving purchasedSubjects to enrollment:', testSeriesSubjectsToPurchase);
      } else {
        return res.status(400).json({ message: 'Please select at least one subject to continue.' });
      }
    }
    if (resourceType === 'book') createObj.bookId = resourceId;

    if (!enrollment) {
      enrollment = await Enrollment.create({
        userId: req.user._id,
        ...createObj,
      });
    } else {
      if (resourceType === 'testseries' && hasExpiredTestSeriesEnrollment) {
        enrollment.paymentId = undefined;
        enrollment.transactionDate = undefined;
      }
      Object.assign(enrollment, createObj);
      await enrollment.save();
    }

    console.log('[Payment] Enrollment created:', { 
      id: enrollment._id, 
      mentorshipId: enrollment.mentorshipId,
      testSeriesId: enrollment.testSeriesId,
      testSeriesAttempt: enrollment.testSeriesAttempt,
      purchasedSubjects: enrollment.purchasedSubjects,
      pendingPurchasedSubjects: enrollment.pendingPurchasedSubjects,
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
      notes: {
        enrollmentId: enrollment._id.toString(),
        resourceType,
        resourceId: resourceId.toString(),
        userId: req.user._id.toString(),
        ...(resourceType === 'testseries' ? { testSeriesAttempt: normalizedTestSeriesAttempt } : {}),
      },
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
      pendingPurchasedSubjects: enrollment.pendingPurchasedSubjects,
      paymentStatus: enrollment.paymentStatus 
    });

    enrollment.paymentStatus = 'paid';
    enrollment.paymentId = razorpay_payment_id;
    enrollment.transactionDate = new Date();
    const pendingPurchasedSubjects = uniqueSubjectTokens(enrollment.pendingPurchasedSubjects);
    if (enrollment.testSeriesId && pendingPurchasedSubjects.length > 0) {
      enrollment.purchasedSubjects = uniqueSubjectTokens([
        ...(Array.isArray(enrollment.purchasedSubjects) ? enrollment.purchasedSubjects : []),
        ...pendingPurchasedSubjects,
      ]);
      enrollment.pendingPurchasedSubjects = [];
    }
    if (enrollment.testSeriesId) {
      const normalizedAttempt = normalizeTestSeriesAttempt(enrollment.testSeriesAttempt);
      if (normalizedAttempt) {
        let examLevel = null;
        if (mongoose.Types.ObjectId.isValid(enrollment.testSeriesId)) {
          const ts = await TestSeries.findById(enrollment.testSeriesId).select('examLevel');
          examLevel = ts?.examLevel || null;
        }
        enrollment.testSeriesAttempt = normalizedAttempt;
        enrollment.expiryDate = getAttemptExpiryDate(normalizedAttempt, {
          purchasedSubjects: enrollment.purchasedSubjects,
          examLevel,
        });
      } else if (!enrollment.expiryDate) {
        // Legacy fallback for old rows created before attempt-based expiry rollout.
        const fallbackExpiry = new Date();
        fallbackExpiry.setDate(fallbackExpiry.getDate() + 60);
        enrollment.expiryDate = fallbackExpiry;
      }
    }
    await enrollment.save();

    console.log('[Payment] Enrollment after payment update:', { 
      id: enrollment._id, 
      testSeriesAttempt: enrollment.testSeriesAttempt,
      expiryDate: enrollment.expiryDate,
      purchasedSubjects: enrollment.purchasedSubjects,
      pendingPurchasedSubjects: enrollment.pendingPurchasedSubjects,
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
