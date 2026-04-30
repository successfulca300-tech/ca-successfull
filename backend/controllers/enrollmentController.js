import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import TestSeries from '../models/TestSeries.js';
import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import { validationResult } from 'express-validator';
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

  // Legacy fallback for records without examLevel/fixedKey.
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
  if (parsed?.seriesType && !isInterScoped) {
    values.push(parsed.seriesType.toLowerCase(), parsed.seriesType);
  }

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

const mergeEnrollmentRows = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const merged = rows[0].toObject ? rows[0].toObject() : { ...rows[0] };
  const allSubjects = new Set();

  rows.forEach((row) => {
    if (Array.isArray(row?.purchasedSubjects)) {
      row.purchasedSubjects.forEach((subject) => allSubjects.add(subject));
    }
  });

  merged.purchasedSubjects = Array.from(allSubjects);
  return merged;
};

const syncDerivedAttemptExpiry = (enrollment) => {
  if (!enrollment?.testSeriesAttempt) return enrollment;
  const derivedExpiry = getAttemptExpiryDate(enrollment.testSeriesAttempt);
  if (!derivedExpiry) return enrollment;

  if (enrollment._doc) {
    enrollment._doc.expiryDate = derivedExpiry;
  } else {
    enrollment.expiryDate = derivedExpiry;
  }
  return enrollment;
};

// @desc    Get user enrollments
// @route   GET /api/enrollments
// @access  Private
export const getEnrollments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = { userId: req.user._id };
    // Only show paid enrollments in user dashboard (unless status filter is provided)
    if (status) {
      query.paymentStatus = status;
    } else {
      query.paymentStatus = 'paid';
    }
    
    const enrollments = await Enrollment.find(query)
      .populate('courseId', 'title price thumbnail')
      .populate('bookId', 'title price thumbnail')
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(limit);

    // Manually populate testSeriesId if it's a valid ObjectId
    for (let enrollment of enrollments) {
      syncDerivedAttemptExpiry(enrollment);
      if (enrollment.testSeriesId && mongoose.Types.ObjectId.isValid(enrollment.testSeriesId)) {
        const testSeries = await TestSeries.findById(enrollment.testSeriesId, 'title price thumbnail');
        if (testSeries) {
          enrollment.testSeriesId = testSeries;
        }
      }

      if (enrollment.testSeriesId) {
        const isActive = isTestSeriesEnrollmentActive(enrollment);
        const isExpired = isTestSeriesEnrollmentExpired(enrollment);
        enrollment._doc.isActiveForAccess = isActive;
        enrollment._doc.isExpired = isExpired;
      }
    }

    const total = await Enrollment.countDocuments(query);

    res.json({
      enrollments,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get enrollment by ID
// @route   GET /api/enrollments/:id
// @access  Private
export const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('courseId', 'title description price thumbnail content videoUrl resources chapters')
      .populate('bookId', 'title description price thumbnail fileUrl');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check authorization
    if (enrollment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Manually populate testSeriesId
    syncDerivedAttemptExpiry(enrollment);
    if (enrollment.testSeriesId && mongoose.Types.ObjectId.isValid(enrollment.testSeriesId)) {
      const testSeries = await TestSeries.findById(enrollment.testSeriesId, 'title description price thumbnail tests');
      if (testSeries) {
        enrollment.testSeriesId = testSeries;
      }
    }

    res.json(enrollment);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create enrollment (initiate purchase)
// @route   POST /api/enrollments
// @access  Private
export const createEnrollment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, testSeriesId, bookId, amount, testSeriesAttempt } = req.body;

    // Prevent admin/subadmin from creating enrollments
    if (req.user && (req.user.role === 'admin' || req.user.role === 'subadmin')) {
      return res.status(403).json({ message: 'Admins and sub-admins cannot enroll in courses' });
    }

    let resource;
    let resourceType = null;
    let parsedSeries = null;
    let normalizedTestSeriesAttempt = null;

    if (courseId) {
      resource = await Course.findById(courseId);
      resourceType = 'course';
    } else if (testSeriesId) {
      normalizedTestSeriesAttempt = normalizeTestSeriesAttempt(testSeriesAttempt);
      if (!normalizedTestSeriesAttempt) {
        const examLevel = resource?.examLevel || parsedSeries?.examLevel || 'final';
        return res.status(400).json({
          message: `Attempt is required for test series purchase. Use upcoming ${getAttemptSelectionHint(examLevel)} values such as ${getAllowedTestSeriesAttempts(examLevel).join(', ')}.`,
        });
      }

      const resolved = await resolveTestSeriesFromIdentifier(testSeriesId, { createIfMissing: false });
      resource = resolved.testSeries;
      parsedSeries = resolved.parsed;
      resourceType = 'testseries';
      const examLevel = resource?.examLevel || parsedSeries?.examLevel || 'final';
      if (!isAttemptAllowedForExamLevel(normalizedTestSeriesAttempt, examLevel)) {
        return res.status(400).json({
          message: `Invalid attempt for this test series. Use upcoming ${getAttemptSelectionHint(examLevel)} values such as ${getAllowedTestSeriesAttempts(examLevel).join(', ')}.`,
        });
      }
    } else if (bookId) {
      resource = await Book.findById(bookId);
      resourceType = 'book';
    }

    if (!resource && !(resourceType === 'testseries' && parsedSeries?.seriesType)) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const buildAttemptExpiryDate = (subjects = []) => {
      if (resourceType !== 'testseries') return null;
      return getAttemptExpiryDate(normalizedTestSeriesAttempt, {
        purchasedSubjects: subjects,
        examLevel: resource?.examLevel || parsedSeries?.examLevel || null,
      });
    };

    // Check if already enrolled/purchased in THIS SPECIFIC resource only
    // Use sparse index - only check the specific resource type field
    const existingQuery = { userId: req.user._id };
    if (resourceType === 'course') {
      existingQuery.courseId = courseId;
    } else if (resourceType === 'testseries') {
      const candidates = buildTestSeriesEnrollmentCandidates(testSeriesId, resource, parsedSeries);
      if (candidates.length > 1) {
        existingQuery.$or = candidates.map((candidate) => ({ testSeriesId: candidate }));
      } else if (candidates.length === 1) {
        existingQuery.testSeriesId = candidates[0];
      } else {
        existingQuery.testSeriesId = testSeriesId;
      }
    } else if (resourceType === 'book') {
      existingQuery.bookId = bookId;
    }

    let existingEnrollment = await Enrollment.findOne(existingQuery);
    if (existingEnrollment && existingEnrollment.paymentStatus === 'paid') {
      if (resourceType === 'testseries') {
        const requestedSubjects = uniqueSubjectTokens(req.body?.purchasedSubjects);
        const hasActiveAccess = isTestSeriesEnrollmentActive(existingEnrollment);
        const hasExpiredAccess = isTestSeriesEnrollmentExpired(existingEnrollment);

        if (hasActiveAccess) {
          const activeAttempt = normalizeTestSeriesAttempt(existingEnrollment.testSeriesAttempt);
          if (activeAttempt && activeAttempt !== normalizedTestSeriesAttempt) {
            return res.status(409).json({
              message: `Current attempt (${activeAttempt}) is still active. You can buy the next attempt after expiry.`,
            });
          }

          const alreadyPurchasedSubjects = uniqueSubjectTokens(existingEnrollment.purchasedSubjects);

          // Legacy rows with empty purchasedSubjects represent full access.
          if (alreadyPurchasedSubjects.length > 0 && requestedSubjects.length > 0) {
            const newSubjects = getUnpurchasedSubjects(requestedSubjects, alreadyPurchasedSubjects);
            if (newSubjects.length > 0) {
              existingEnrollment.purchasedSubjects = uniqueSubjectTokens([
                ...alreadyPurchasedSubjects,
                ...newSubjects,
              ]);
              await existingEnrollment.save();
            }
          }
        } else if (hasExpiredAccess) {
          if (requestedSubjects.length > 0) {
            existingEnrollment.purchasedSubjects = requestedSubjects;
          }
          const subjectsForExpiry = requestedSubjects.length > 0
            ? requestedSubjects
            : uniqueSubjectTokens(existingEnrollment.purchasedSubjects);
          const attemptExpiryDate = buildAttemptExpiryDate(subjectsForExpiry);
          if (!attemptExpiryDate) {
            return res.status(400).json({ message: 'Invalid attempt selection for test series purchase' });
          }
          existingEnrollment.testSeriesAttempt = normalizedTestSeriesAttempt;
          existingEnrollment.expiryDate = attemptExpiryDate;
          existingEnrollment.pendingPurchasedSubjects = [];
          existingEnrollment.paymentId = undefined;

          if (req.body && (req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'completed')) {
            existingEnrollment.paymentStatus = 'paid';
            existingEnrollment.transactionDate = new Date();
          } else {
            existingEnrollment.paymentStatus = 'pending';
          }

          await existingEnrollment.save();
        }
      }

      // If already enrolled and paid in THIS specific resource, return the existing enrollment (200)
      const populated = await Enrollment.findById(existingEnrollment._id)
        .populate('courseId', 'title price thumbnail')
        .populate('bookId', 'title price thumbnail');

      // Manually populate testSeriesId
      if (populated.testSeriesId && mongoose.Types.ObjectId.isValid(populated.testSeriesId)) {
        const testSeries = await TestSeries.findById(populated.testSeriesId, 'title price thumbnail');
        if (testSeries) {
          populated.testSeriesId = testSeries;
        }
      }
      syncDerivedAttemptExpiry(populated);

      return res.status(200).json(populated);
    }
    
    if (existingEnrollment) {
      if (resourceType === 'testseries') {
        const requestedSubjects = uniqueSubjectTokens(req.body?.purchasedSubjects);
        if (requestedSubjects.length > 0) {
          existingEnrollment.purchasedSubjects = requestedSubjects;
        }
        const subjectsForExpiry = requestedSubjects.length > 0
          ? requestedSubjects
          : uniqueSubjectTokens(existingEnrollment.purchasedSubjects);
        const attemptExpiryDate = buildAttemptExpiryDate(subjectsForExpiry);
        if (!attemptExpiryDate) {
          return res.status(400).json({ message: 'Invalid attempt selection for test series purchase' });
        }
        existingEnrollment.testSeriesAttempt = normalizedTestSeriesAttempt;
        existingEnrollment.expiryDate = attemptExpiryDate;
        existingEnrollment.pendingPurchasedSubjects = [];
      }

      // If enrollment exists but not paid, upgrade it when caller requests paid
      if (req.body && (req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'completed')) {
        existingEnrollment.paymentStatus = 'paid';
        existingEnrollment.transactionDate = new Date();
        await existingEnrollment.save();
        // Increment course count if applicable
        if (existingEnrollment.courseId) {
          try {
            await Course.findByIdAndUpdate(existingEnrollment.courseId, { $inc: { enrollmentCount: 1 } });
          } catch (err) {
            console.error('Failed to increment course enrollment count on upgrade:', err);
          }
        }
        const populated = await Enrollment.findById(existingEnrollment._id)
          .populate('courseId', 'title price thumbnail')
          .populate('bookId', 'title price thumbnail');

        // Manually populate testSeriesId
        if (populated.testSeriesId && mongoose.Types.ObjectId.isValid(populated.testSeriesId)) {
          const testSeries = await TestSeries.findById(populated.testSeriesId, 'title price thumbnail');
          if (testSeries) {
            populated.testSeriesId = testSeries;
          }
        }
        syncDerivedAttemptExpiry(populated);

        return res.status(200).json(populated);
      }

      await existingEnrollment.save();

      // If enrollment exists but not paid and no upgrade requested, return it
      const populated = await Enrollment.findById(existingEnrollment._id)
        .populate('courseId', 'title price thumbnail')
        .populate('bookId', 'title price thumbnail');

      // Manually populate testSeriesId
      if (populated.testSeriesId && mongoose.Types.ObjectId.isValid(populated.testSeriesId)) {
        const testSeries = await TestSeries.findById(populated.testSeriesId, 'title price thumbnail');
        if (testSeries) {
          populated.testSeriesId = testSeries;
        }
      }
      syncDerivedAttemptExpiry(populated);

      return res.status(200).json(populated);
    }

    const createObj = {
      userId: req.user._id,
      paymentStatus: 'pending',
      amount: amount || resource.price || 0,
    };
    if (resourceType === 'course') createObj.courseId = courseId;
    if (resourceType === 'testseries') {
      createObj.testSeriesId = resource?._id || parsedSeries?.fixedKey || String(testSeriesId || '').toLowerCase();
      createObj.testSeriesAttempt = normalizedTestSeriesAttempt;

      const requestedSubjects = uniqueSubjectTokens(req.body?.purchasedSubjects);
      if (requestedSubjects.length === 0) {
        return res.status(400).json({ message: 'Please select at least one subject to continue.' });
      }
      const attemptExpiryDate = buildAttemptExpiryDate(requestedSubjects);
      if (!attemptExpiryDate) {
        return res.status(400).json({ message: 'Invalid attempt selection for test series purchase' });
      }
      createObj.expiryDate = attemptExpiryDate;
      createObj.purchasedSubjects = requestedSubjects;
    }
    if (resourceType === 'book') createObj.bookId = bookId;

    // Allow immediate completion when caller includes paymentStatus: 'completed' or 'paid'
    if (req.body && (req.body.paymentStatus === 'completed' || req.body.paymentStatus === 'paid')) {
      createObj.paymentStatus = 'paid';
      createObj.transactionDate = new Date();
      
      // createObj.expiryDate is already set above for test series.
    }

    try {
      const enrollment = await Enrollment.create(createObj);

      // If just created as paid, update related counts for course only
      if (enrollment.paymentStatus === 'paid' && enrollment.courseId) {
        try {
          await Course.findByIdAndUpdate(enrollment.courseId, { $inc: { enrollmentCount: 1 } });
        } catch (err) {
          console.error('Failed to increment course enrollment count:', err);
        }
      }

      // Remove the enrolled course from user's cart if it exists
      try {
        if (enrollment.paymentStatus === 'paid' && enrollment.courseId) {
          const cart = await Cart.findOne({ user: enrollment.userId });
          if (cart) {
            cart.items = cart.items.filter(item => item.courseId.toString() !== enrollment.courseId.toString());
            await cart.save();
          }
        }
      } catch (e) {
        console.warn('Failed to remove course from cart:', e.message);
      }

      const populatedEnrollment = await Enrollment.findById(enrollment._id)
        .populate('courseId', 'title price thumbnail')
        .populate('bookId', 'title price thumbnail');

      // Manually populate testSeriesId
      if (populatedEnrollment.testSeriesId && mongoose.Types.ObjectId.isValid(populatedEnrollment.testSeriesId)) {
        const testSeries = await TestSeries.findById(populatedEnrollment.testSeriesId, 'title price thumbnail');
        if (testSeries) {
          populatedEnrollment.testSeriesId = testSeries;
        }
      }
      syncDerivedAttemptExpiry(populatedEnrollment);

      res.status(201).json(populatedEnrollment);
    } catch (createError) {
      // Handle duplicate key (unique index) errors - this means enrollment already exists for THIS specific resource
      if (createError && createError.code === 11000) {
        // Try to find the existing enrollment for this specific resource
        const existing = await Enrollment.findOne(existingQuery)
          .populate('courseId', 'title price thumbnail')
          .populate('bookId', 'title price thumbnail');

        // Manually populate testSeriesId
        if (existing && existing.testSeriesId && mongoose.Types.ObjectId.isValid(existing.testSeriesId)) {
          const testSeries = await TestSeries.findById(existing.testSeriesId, 'title price thumbnail');
          if (testSeries) {
            existing.testSeriesId = testSeries;
          }
        }
        syncDerivedAttemptExpiry(existing);

        if (existing && existing.paymentStatus === 'paid') {
          // If enrollment already exists and is paid, return it as success so callers can proceed.
          return res.status(200).json(existing);
        }
        // If exists but not paid, return it as-is (caller can upgrade/payment flow)
        if (existing) {
          return res.status(200).json(existing);
        }
        // As a last resort, return a generic 400
        return res.status(400).json({ message: 'Already purchased/enrolled in this resource' });
      }
      throw createError;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update enrollment (payment success/update progress)
// @route   PUT /api/enrollments/:id
// @access  Private/Admin
export const updateEnrollment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check authorization
    if (enrollment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { paymentStatus, paymentId, progress, isCompleted, completionDate } = req.body;

    if (paymentStatus) {
      enrollment.paymentStatus = paymentStatus;
      if (paymentId) enrollment.paymentId = paymentId;
      if (paymentStatus === 'paid') {
        enrollment.transactionDate = new Date();
        // Increment enrollment count in course
        await Course.findByIdAndUpdate(enrollment.courseId, { $inc: { enrollmentCount: 1 } });
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
      }
    }

    if (progress !== undefined) enrollment.progress = progress;
    if (isCompleted !== undefined) {
      enrollment.isCompleted = isCompleted;
      if (isCompleted) {
        enrollment.completionDate = completionDate || new Date();
      }
    }

    const updatedEnrollment = await enrollment.save();
    const populatedEnrollment = await Enrollment.findById(updatedEnrollment._id)
      .populate('courseId', 'title price');

    res.json(populatedEnrollment);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete enrollment (admin only)
// @route   DELETE /api/enrollments/:id
// @access  Private/Admin
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await enrollment.deleteOne();
    res.json({ message: 'Enrollment deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if user is enrolled in course
// @route   GET /api/enrollments/check?courseId=...&testSeriesId=...&bookId=...
// @access  Private
export const checkEnrollment = async (req, res) => {
  try {
    const { courseId, testSeriesId, bookId } = req.query;

    const query = { userId: req.user._id };
    if (courseId) query.courseId = courseId;
    if (testSeriesId) {
      const resolved = await resolveTestSeriesFromIdentifier(testSeriesId);
      const candidates = buildTestSeriesEnrollmentCandidates(testSeriesId, resolved.testSeries, resolved.parsed);
      if (candidates.length > 1) {
        query.$or = candidates.map((candidate) => ({ testSeriesId: candidate }));
      } else if (candidates.length === 1) {
        query.testSeriesId = candidates[0];
      } else {
        query.testSeriesId = String(testSeriesId || '').toLowerCase();
      }
    }
    if (bookId) query.bookId = bookId;
    
    console.log('[CheckEnrollment] Querying with:', query);

    const allEnrollments = await Enrollment.find(query)
      .populate('courseId', 'title')
      .populate('bookId', 'title')
      .sort({ createdAt: -1 });

    const paidEnrollments = allEnrollments.filter((enrollment) => enrollment.paymentStatus === 'paid');
    console.log(
      '[CheckEnrollment] Paid enrollments returned (count):',
      paidEnrollments.length,
      'ids:',
      paidEnrollments.map((enrollment) => enrollment._id)
    );

    const activePaidEnrollments = testSeriesId
      ? paidEnrollments.filter((enrollment) => isTestSeriesEnrollmentActive(enrollment))
      : paidEnrollments;

    console.log(
      '[CheckEnrollment] Active paid enrollments (count):',
      activePaidEnrollments.length,
      'ids:',
      activePaidEnrollments.map((enrollment) => enrollment._id)
    );

    let rowsForMerged = allEnrollments;
    if (activePaidEnrollments.length > 0) {
      rowsForMerged = activePaidEnrollments;
    } else if (paidEnrollments.length > 0) {
      rowsForMerged = paidEnrollments;
    }

    const mergedEnrollment = mergeEnrollmentRows(rowsForMerged);
    console.log('[CheckEnrollment] Final enrollment:', !!mergedEnrollment, 'with subjects:', mergedEnrollment?.purchasedSubjects);

    // Manually populate testSeriesId
    if (mergedEnrollment && mergedEnrollment.testSeriesId && mongoose.Types.ObjectId.isValid(mergedEnrollment.testSeriesId)) {
      const testSeries = await TestSeries.findById(mergedEnrollment.testSeriesId, 'title');
      if (testSeries) {
        mergedEnrollment.testSeriesId = testSeries;
      }
    }
    syncDerivedAttemptExpiry(mergedEnrollment);

    const isExpired = Boolean(
      testSeriesId &&
      mergedEnrollment &&
      mergedEnrollment.paymentStatus === 'paid' &&
      isTestSeriesEnrollmentExpired(mergedEnrollment)
    );
    if (mergedEnrollment && testSeriesId) {
      mergedEnrollment.isExpired = isExpired;
      mergedEnrollment.isActiveForAccess = !isExpired && mergedEnrollment.paymentStatus === 'paid';
    }

    const isEnrolled = testSeriesId
      ? activePaidEnrollments.length > 0
      : Boolean(mergedEnrollment && mergedEnrollment.paymentStatus === 'paid');

    res.json({
      enrolled: isEnrolled,
      enrollment: mergedEnrollment || null,
      purchasedSubjects: mergedEnrollment?.purchasedSubjects || [],
      isExpired,
    });
  } catch (error) {
    console.error('[CheckEnrollment] Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
