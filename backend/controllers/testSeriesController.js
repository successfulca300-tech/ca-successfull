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
    title: 'Full Syllabus Test Series',
    description: `Full Syllabus Test Series

Best suited for students who have completed the syllabus

Full-length exam-oriented question papers

Available in Series 1, Series 2 & Series 3

Helps in real exam time management practice

Enroll subject-wise, group-wise or series-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided
`,
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 450,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 6000,
      paperPrice: 450,
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
    syllabusBreakdown: 'Full Syllabus Test Series Structure:\n\nSeries: Series 1, Series 2, Series 3 (3 complete series)\n\nGroups & Subjects:\n- Group 1: FR, AFM, Audit (3 subjects)\n- Group 2: DT, IDT (2 subjects)\n- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)\n\nPapers per Subject:\n- Each subject: 1 paper per series\n- Total: 3 series × 5 subjects × 1 paper = 15 papers',
    seriesDates: {
      series1UploadDate: 'Papers will be uploaded from 1st February 2025',
      series2UploadDate: 'Papers will be uploaded from 7th March 2026',
      series3UploadDate: 'Papers will be uploaded from 5th April 2026',
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
    title: '50% Syllabus Test Series',
    description: `50% Syllabus Test Series

Ideal for students who want to test preparation in two phases

2 Papers per subject

50% + 50% syllabus coverage = 100%

Helps in gradual and structured syllabus completion

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
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
      paperPrice: 450,
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
    title: '30% Syllabus Test Series',
    description: `30% Syllabus Test Series

Perfect for early-stage CA preparation

Syllabus divided into smaller and manageable parts

3 Papers per subject

30% + 30% + 30% syllabus coverage = 100%

Helps in concept-wise and topic-wise preparation

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
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
      paperPrice: 450,
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
    title: 'CA Successful Specials',
    description: `CA Successful Test Series

Designed for serious CA aspirants aiming for exam success

Total 6 papers per subject for multiple revisions

1 Full syllabus paper (100% coverage)

2 Half syllabus papers (50% + 50%)

3 Part syllabus papers (30% + 30% + 30%)

Complete syllabus covered with repeated practice

Enroll subject-wise or group-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 1200,
      comboPrice: 3600,
      allSubjectsPrice: 6000,
      paperPrice: 450,
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
  // CA Inter fixed series
  {
    _id: 'inter-s1',
    title: 'Full Syllabus Test Series (Inter)',
    description: 'Full-syllabus test series for CA Inter with 2 series, 1 paper per subject in each series.',
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 400,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    pricing: {
      subjectPrice: 400,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 4000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {
      'Advance accounting': 1,
      'Corporate law': 1,
      'Taxation': 1,
      'Costing': 1,
      'Audit': 1,
      'FM SM': 1,
    },
  },
  {
    _id: 'inter-s2',
    title: '50% Syllabus Test Series (Inter)',
    description: 'Focused 50% syllabus coverage for CA Inter. 2 papers per subject.',
    seriesType: 'S2',
    seriesTypeLabel: '50% Syllabus',
    price: 400,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    pricing: {
      subjectPrice: 400,
      comboPrice: 1200,
      allSubjectsPrice: 2400,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {
      'Advance accounting': 2,
      'Corporate law': 2,
      'Taxation': 2,
      'Costing': 2,
      'Audit': 2,
      'FM SM': 2,
    },
  },
  {
    _id: 'inter-s3',
    title: 'Chapterwise Test Series (Inter)',
    description: 'Chapterwise practice for CA Inter. 5 papers per subject.',
    seriesType: 'S3',
    seriesTypeLabel: 'Chapterwise',
    price: 700,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    pricing: {
      subjectPrice: 700,
      comboPrice: 2100,
      allSubjectsPrice: 4200,
      paperPrice: 700,
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {
      'Advance accounting': 5,
      'Corporate law': 5,
      'Taxation': 5,
      'Costing': 5,
      'Audit': 5,
      'FM SM': 5,
    },
  },
  {
    _id: 'inter-s4',
    title: 'CA Successful Specials (Inter)',
    description: 'Special curated series with 8 papers per subject for CA Inter.',
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 1600,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    pricing: {
      subjectPrice: 1400,
      comboPrice: 4200,
      allSubjectsPrice: 8400,
      paperPrice: 700,
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 200, label: 'CAINTER2026 - ₹200 off' },
    ],
    highlights: [],
    syllabusBreakdown: '',
    seriesDates: {},
    papersPerSubject: {
      'Advance accounting': 8,
      'Corporate law': 8,
      'Taxation': 8,
      'Costing': 8,
      'Audit': 8,
      'FM SM': 8,
    },
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
    const { category, search, seriesType, examLevel } = req.query;

    const query = { isActive: true, publishStatus: 'published' };

    if (category) {
      query.category = category;
    }

    if (seriesType) {
      query.seriesType = seriesType;
    }

    if (examLevel) {
      query.examLevel = examLevel;
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
    // allow subadmin to filter by examLevel when managing their series
    if (req.query && req.query.examLevel) {
      query.examLevel = req.query.examLevel;
    }

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

    // If not found by ObjectId, prefer fixed shorthand IDs (e.g. 's1', 's2', 'inter-s1')
    if (!testSeries) {
      const lowerId = id.toLowerCase();
      const fixedSeries = getFixedSeriesById(lowerId);
      if (fixedSeries) {
        // Get full fixed series data from FIXED_TEST_SERIES array
        const fullFixedSeriesData = FIXED_TEST_SERIES.find(s => s._id === lowerId);
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
            cardThumbnail: null,
            category: null,
            createdBy: null,
            mode: fullFixedSeriesData.mode || 'Online',
            group: fullFixedSeriesData.group || 'Both',
            subjects: fullFixedSeriesData.subjects || [],
            // Derive exam level for fixed entries from id prefix (e.g., 'inter-')
            examLevel: lowerId.startsWith('inter-') ? 'inter' : 'final',
          };

          // If a managed TestSeries exists for this fixed id (fixedKey), merge its overrides
          try {
            const managed = await TestSeries.findOne({ fixedKey: { $regex: `^${id}$`, $options: 'i' } });
            if (managed) {
              fullFixedSeries.thumbnail = managed.cardThumbnail || managed.thumbnail || fullFixedSeries.thumbnail;
              fullFixedSeries.cardThumbnail = managed.cardThumbnail || managed.thumbnail || fullFixedSeries.cardThumbnail;
              if (managed.cardTitle) fullFixedSeries.title = managed.cardTitle;
              if (managed.cardDescription) fullFixedSeries.description = managed.cardDescription;
              // allow managed pricing overrides to merge
              if (managed.pricing && Object.keys(managed.pricing || {}).length > 0) {
                fullFixedSeries.pricing = Object.assign({}, fullFixedSeries.pricing || {}, managed.pricing || {});
              }
              // If managed entry has explicit examLevel, override
              if (managed.examLevel) {
                fullFixedSeries.examLevel = managed.examLevel;
              }
            }
          } catch (mergeErr) {
            console.error('Error merging managed fixed series data:', mergeErr);
          }

          return res.json({ success: true, testSeries: fullFixedSeries });
        }
      }
    }

    // If still not resolved, try to find by seriesType (S1..S4) in DB
    if (!testSeries) {
      const seriesType = id.toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType })
        .populate('category', 'name')
        .populate('createdBy', 'name email');
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
      examLevel,
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

    // Validate examLevel
    const validLevels = ['inter', 'final'];
    const normalizedExamLevel = examLevel && validLevels.includes(String(examLevel).toLowerCase()) ? String(examLevel).toLowerCase() : 'final';

    const testSeries = await TestSeries.create({
      title,
      description,
      category,
      seriesType,
      examLevel: normalizedExamLevel,
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
      publishStatus: req.user.role === 'subadmin' ? 'published' : 'draft',
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
      examLevel,
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
    if (examLevel) {
      const normalized = String(examLevel).toLowerCase();
      if (['inter', 'final'].includes(normalized)) testSeries.examLevel = normalized;
    }
    if (pricing) testSeries.pricing = pricing;
    if (discountCodes) testSeries.discountCodes = discountCodes;
    if (subjects) testSeries.subjects = subjects;
    if (highlights) testSeries.highlights = highlights;
    if (syllabusBreakdown) testSeries.syllabusBreakdown = syllabusBreakdown;
    if (testSchedule) testSeries.testSchedule = testSchedule;
    if (instructions) testSeries.instructions = instructions;
    if (sampleAnswerSheets) testSeries.sampleAnswerSheets = sampleAnswerSheets;
    if (papersPerSubject) testSeries.papersPerSubject = papersPerSubject;
    // Merge seriesDates: only update keys with non-empty values to avoid accidental clearing
    if (seriesDates && typeof seriesDates === 'object') {
      testSeries.seriesDates = testSeries.seriesDates || {};
      Object.keys(seriesDates).forEach((k) => {
        const v = seriesDates[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          testSeries.seriesDates[k] = v;
        }
      });
    }
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
    // Ensure any papersPerSubject configured on the testSeries (fixed entries)
    // are forwarded inside the `pricing` object so service logic can honour them.
    const pricingConfig = Object.assign({}, testSeries.pricing || {});
    if (testSeries.papersPerSubject && Object.keys(testSeries.papersPerSubject).length > 0) {
      pricingConfig.papersPerSubject = testSeries.papersPerSubject;
    }

    const pricingResult = calculatePrice({
      seriesType: testSeries.seriesType,
      selectedSeries: selectedSeries || [],
      selectedSubjects,
      pricing: pricingConfig,
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
