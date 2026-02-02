import TestSeries from '../models/TestSeries.js';
import TestSeriesPaper from '../models/TestSeriesPaper.js';
import Offer from '../models/Offer.js';
import { validationResult } from 'express-validator';
import { calculatePrice, validateSelection } from '../utils/testSeriesPricingService.js';
import mongoose from 'mongoose';

// Fixed test series data (same as frontend)
const FIXED_TEST_SERIES = [
  {
    _id: 's1',
    title: 'S1 Full Syllabus Test Series',
    description: 'Comprehensive full-syllabus test series with 3 series (Series 1, 2, 3), each containing 1 test paper per subject.',
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 6000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [
      '3 Complete Test Series (Series 1, 2, 3)',
      '1 Test Paper Per Subject Per Series',
      '15 Total Test Papers',
      'Full Syllabus Coverage',
      'Group-wise Categorization',
      'Detailed Solutions',
      'Performance Analytics',
    ],
    syllabusBreakdown: 'S1 Full Syllabus Test Series Structure:\n\nSeries: Series 1, Series 2, Series 3 (3 complete series)\n\nGroups & Subjects:\n- Group 1: FR, AFM, Audit (3 subjects)\n- Group 2: DT, IDT (2 subjects)\n- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)\n\nPapers per Subject:\n- Each subject: 1 paper per series\n- Total: 3 series × 5 subjects × 1 paper = 15 papers',
    seriesDates: {
      series1UploadDate: 'Papers will be uploaded by 10th December 2025',
      series2UploadDate: 'Papers will be uploaded by 15th February 2026',
      series3UploadDate: 'Papers will be uploaded by 20th March 2026',
      group1SubmissionDate: '25th April 2026',
      group2SubmissionDate: '30th April 2026',
    },
    papersPerSubject: {
      'FR': 1,
      'AFM': 1,
      'Audit': 1,
      'DT': 1,
      'IDT': 1,
    },
  },
  {
    _id: 's2',
    title: 'S2 50% Syllabus Test Series',
    description: 'Focused test series covering the most important 50% of the syllabus. 2 test papers per subject across all groups.',
    seriesType: 'S2',
    seriesTypeLabel: '50% Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {},
  },
  {
    _id: 's3',
    title: 'S3 30% Syllabus Test Series',
    description: 'Quick revision test series covering 30% of the syllabus. 1 test paper per subject.',
    seriesType: 'S3',
    seriesTypeLabel: '30% Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {},
  },
  {
    _id: 's4',
    title: 'S4 CA Successful Specials',
    description: 'Special test series with curated questions and advanced preparation materials.',
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {},
  },
];

function getFixedSeriesById(id) {
  return FIXED_TEST_SERIES.find(s => s._id === id) || null;
}

// @desc    Get all published test series
// @route   GET /api/testseries
// @access  Public
export const getTestSeries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category, search, seriesType } = req.query;

    const query = { isActive: true, publishStatus: 'published' };

    if (category) {
      query.category = category;
    }

    if (seriesType) {
      query.seriesType = seriesType;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const testSeries = await TestSeries.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TestSeries.countDocuments(query);

    res.json({
      success: true,
      testSeries,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get test series by category
// @route   GET /api/testseries/category/:categoryId
// @access  Public
export const getTestSeriesByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { categoryId } = req.params;

    const query = { 
      isActive: true, 
      publishStatus: 'published',
      category: categoryId 
    };

    const testSeries = await TestSeries.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await TestSeries.countDocuments(query);

    res.json({
      testSeries,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all series for subadmin (including drafts)
// @route   GET /api/testseries/subadmin/my-series
// @access  Private/SubAdmin
export const getMyTestSeries = async (req, res) => {
  try {
    const query = { createdBy: req.user._id };

    const testSeries = await TestSeries.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, testSeries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get test series by ID (with access control)
// @route   GET /api/testseries/:id
// @access  Public/Private
export const getTestSeriesById = async (req, res) => {
  try {
    const { id } = req.params;
    let testSeries = null;

    // First try to find in database by ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      testSeries = await TestSeries.findById(id)
        .populate('category', 'name')
        .populate('createdBy', 'name email');
    }

    // If not found, try to find by seriesType
    if (!testSeries) {
      const seriesType = id.toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType })
        .populate('category', 'name')
        .populate('createdBy', 'name email');
    }

    // If still not found, check fixed test series (shorthand IDs like 's1', 's2', etc.)
    if (!testSeries) {
      const fixedSeries = getFixedSeriesById(id.toLowerCase());
      if (fixedSeries) {
        // Get full fixed series data from FIXED_TEST_SERIES array
        const fullFixedSeriesData = FIXED_TEST_SERIES.find(s => s._id === id.toLowerCase());
        if (fullFixedSeriesData) {
          // Return fixed series data with additional fields
          const fullFixedSeries = {
            _id: fullFixedSeriesData._id,
            title: fullFixedSeriesData.title,
            seriesType: fullFixedSeriesData.seriesType,
            description: fullFixedSeriesData.description || `${fullFixedSeriesData.title} - Comprehensive test series for CA preparation`,
            pricing: fullFixedSeriesData.pricing,
            discountCodes: fullFixedSeriesData.discountCodes,
            highlights: fullFixedSeriesData.highlights || [],
            syllabusBreakdown: fullFixedSeriesData.syllabusBreakdown || '',
            instructions: fullFixedSeriesData.instructions || '',
            seriesDates: fullFixedSeriesData.seriesDates || {},
            papersPerSubject: fullFixedSeriesData.papersPerSubject || {},
            isActive: true,
            publishStatus: 'published',
            // Add default values for fields that might be expected
            thumbnail: null,
            category: null,
            createdBy: null,
            mode: fullFixedSeriesData.mode || 'Online',
            group: fullFixedSeriesData.group || 'Both',
            subjects: fullFixedSeriesData.subjects || [],
          };
          return res.json({ success: true, testSeries: fullFixedSeries });
        }
      }
    }

    if (!testSeries) {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }

    // Check if user has access to non-published series
    if (testSeries.publishStatus !== 'published' || !testSeries.isActive) {
      if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== testSeries.createdBy._id.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // If thumbnail is an Appwrite URL, proxy it through backend so browser does not need Appwrite headers
    try {
      const thumbnail = testSeries.thumbnail;
      if (thumbnail && typeof thumbnail === 'string' && /\/storage\/buckets\//.test(thumbnail)) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.get('host');
        const baseFromReq = `${protocol}://${host}`;
        const base = (process.env.BACKEND_URL || baseFromReq).replace(/\/$/, '');
        testSeries.thumbnail = `${base}/api/files/public?fileUrl=${encodeURIComponent(thumbnail)}`;
      }
    } catch (e) {
      console.warn('Failed to proxify thumbnail URL for testSeries', e.message);
    }

    res.json({ success: true, testSeries });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create test series (subadmin/admin)
// @route   POST /api/testseries
// @access  Private
export const createTestSeries = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      seriesType,
      pricing,
      discountCodes,
      subjects,
      highlights,
      syllabusBreakdown,
      testSchedule,
      instructions,
      sampleAnswerSheets,
      papersPerSubject,
      seriesDates,
    } = req.body;

    // Validate seriesType
    const validTypes = ['S1', 'S2', 'S3', 'S4'];
    if (!validTypes.includes(seriesType)) {
      return res.status(400).json({ success: false, message: 'Invalid series type' });
    }

    const testSeries = await TestSeries.create({
      title,
      description,
      category,
      seriesType,
      pricing: pricing || {},
      discountCodes: discountCodes || [],
      subjects: subjects || ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
      highlights: highlights || [],
      syllabusBreakdown: syllabusBreakdown || '',
      testSchedule: testSchedule || [],
      instructions: instructions || '',
      sampleAnswerSheets: sampleAnswerSheets || [],
      papersPerSubject: papersPerSubject || {},
      seriesDates: seriesDates || {},
      createdBy: req.user._id,
      publishStatus: 'draft',
      isActive: true,
    });

    const populatedTestSeries = await TestSeries.findById(testSeries._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, testSeries: populatedTestSeries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update test series (creator or admin)
// @route   PUT /api/testseries/:id
// @access  Private
export const updateTestSeries = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let testSeries = await TestSeries.findById(req.params.id);
    if (!testSeries) {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }

    if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const {
      title,
      description,
      category,
      seriesType,
      pricing,
      discountCodes,
      subjects,
      highlights,
      syllabusBreakdown,
      testSchedule,
      instructions,
      sampleAnswerSheets,
      papersPerSubject,
      seriesDates,
      isActive,
    } = req.body;

    if (title) testSeries.title = title;
    if (description) testSeries.description = description;
    if (category) testSeries.category = category;
    if (seriesType) testSeries.seriesType = seriesType;
    if (pricing) testSeries.pricing = pricing;
    if (discountCodes) testSeries.discountCodes = discountCodes;
    if (subjects) testSeries.subjects = subjects;
    if (highlights) testSeries.highlights = highlights;
    if (syllabusBreakdown) testSeries.syllabusBreakdown = syllabusBreakdown;
    if (testSchedule) testSeries.testSchedule = testSchedule;
    if (instructions) testSeries.instructions = instructions;
    if (sampleAnswerSheets) testSeries.sampleAnswerSheets = sampleAnswerSheets;
    if (papersPerSubject) testSeries.papersPerSubject = papersPerSubject;
    if (seriesDates) testSeries.seriesDates = seriesDates;
    if (isActive !== undefined) testSeries.isActive = isActive;

    const updatedTestSeries = await testSeries.save();
    const populatedTestSeries = await TestSeries.findById(updatedTestSeries._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.json({ success: true, testSeries: populatedTestSeries });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete test series (creator or admin)
// @route   DELETE /api/testseries/:id
// @access  Private
export const deleteTestSeries = async (req, res) => {
  try {
    const testSeries = await TestSeries.findById(req.params.id);
    if (!testSeries) {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }

    if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await TestSeriesPaper.deleteMany({ testSeriesId: req.params.id });
    await testSeries.deleteOne();
    res.json({ success: true, message: 'Test series deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Publish test series (admin approval)
// @route   PUT /api/testseries/:id/publish
// @access  Private/Admin
export const publishTestSeries = async (req, res) => {
  try {
    const testSeries = await TestSeries.findById(req.params.id);
    if (!testSeries) {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }

    const { action } = req.body;

    if (action === 'approve') {
      testSeries.publishStatus = 'published';
      testSeries.isActive = true;
    } else if (action === 'reject') {
      testSeries.publishStatus = 'rejected';
    } else if (action === 'draft') {
      testSeries.publishStatus = 'draft';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const updatedTestSeries = await testSeries.save();
    const populatedTestSeries = await TestSeries.findById(updatedTestSeries._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.json({ success: true, testSeries: populatedTestSeries });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Calculate price for a test series selection
// @route   POST /api/testseries/calculate-price
// @access  Public
export const calculatePricing = async (req, res) => {
  try {
    let { testSeriesId, selectedSeries, selectedSubjects, couponCode } = req.body;

    // Ensure arrays are valid
    selectedSeries = Array.isArray(selectedSeries) ? selectedSeries : [];
    selectedSubjects = Array.isArray(selectedSubjects) ? selectedSubjects : [];
    couponCode = typeof couponCode === 'string' ? couponCode : undefined;

    // Validate input
    if (!testSeriesId) {
      return res.status(400).json({ success: false, message: 'Test series ID is required' });
    }

    if (!selectedSubjects || selectedSubjects.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one subject must be selected' });
    }

    // Fetch test series to get pricing config (check fixed first, then DB)
    let testSeries = getFixedSeriesById(testSeriesId);
    if (!testSeries) {
      testSeries = await TestSeries.findById(testSeriesId);
      if (!testSeries) {
        return res.status(404).json({ success: false, message: 'Test series not found' });
      }
    }

    // Validate selection against series type
    const validation = validateSelection(testSeries.seriesType, selectedSeries, selectedSubjects);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Check for dynamic offer if couponCode provided
    let dynamicOffer = null;
    if (couponCode) {
      const now = new Date();
      dynamicOffer = await Offer.findOne({
        code: couponCode,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      });
    }

    // Build coupon map from discount codes
    const coupons = {};
    if (testSeries.discountCodes && Array.isArray(testSeries.discountCodes)) {
      testSeries.discountCodes.forEach(code => {
        coupons[code.code] = {
          type: code.type,
          value: code.value,
        };
      });
    }

    // Add dynamic offer if found
    if (dynamicOffer) {
      coupons[couponCode] = {
        type: dynamicOffer.discountType === 'percentage' ? 'percent' : 'flat',
        value: dynamicOffer.discountValue,
      };
    }

    // Calculate price using the pricing service
    const pricingResult = calculatePrice({
      seriesType: testSeries.seriesType,
      selectedSeries: selectedSeries || [],
      selectedSubjects,
      pricing: testSeries.pricing,
      couponCode,
      coupons,
    });

    res.json({
      success: true,
      pricing: pricingResult,
      testSeriesDetails: {
        id: testSeries._id,
        title: testSeries.title,
        seriesType: testSeries.seriesType,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
