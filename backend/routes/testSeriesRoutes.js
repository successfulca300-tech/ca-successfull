import express from 'express';
import { body } from 'express-validator';
import { protect, subadmin, admin } from '../middleware/auth.js';
import {
  getTestSeries,
  getTestSeriesById,
  getTestSeriesByCategory,
  getMyTestSeries,
  createTestSeries,
  updateTestSeries,
  deleteTestSeries,
  publishTestSeries,
  calculatePricing,
} from '../controllers/testSeriesController.js';
import {
  uploadPaper,
  getPapersByTestSeries,
  getPapersGroupedBySubject,
  getMyPapers,
  updatePaper,
  deletePaper,
  getPapersSummary,
} from '../controllers/testSeriesPaperController.js';
import uploadPaperMiddleware from '../config/multer.js';

const router = express.Router();

const createTestSeriesValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('seriesType').isIn(['S1', 'S2', 'S3', 'S4']).withMessage('Valid series type is required'),
];

const updateTestSeriesValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('seriesType').optional().isIn(['S1', 'S2', 'S3', 'S4']).withMessage('Invalid series type'),
];

const uploadPaperValidation = [
  body('group').optional().isIn(['Group 1', 'Group 2', 'Both']).withMessage('Valid group is required'),
  body('subject').optional().trim().notEmpty().withMessage('Subject is required'),
  body('paperType').optional().isIn(['question', 'suggested', 'evaluated']).withMessage('Valid paper type is required'),
  body('paperNumber').optional().isInt({ min: 1 }).withMessage('Paper number must be a positive integer'),
  body('syllabusPercentage').optional().isIn(['100%', '50%', '30%']).withMessage('Valid syllabus percentage is required'),
];

// IMPORTANT: Order matters! Specific routes BEFORE generic ones with params

// Price calculation (public)
router.post('/calculate-price', calculatePricing);

// SubAdmin routes - MUST be early to avoid conflict with generic :id route
router.get('/subadmin/my-papers', protect, subadmin, getMyPapers);
router.get('/subadmin/my-series', protect, subadmin, getMyTestSeries);

// Paper management - specific routes BEFORE parameterized routes
router.get('/:testSeriesId/papers/grouped', protect, getPapersGroupedBySubject);
router.get('/:testSeriesId/papers-summary', getPapersSummary);
router.get('/:testSeriesId/papers', getPapersByTestSeries);
router.post('/:testSeriesId/papers', protect, subadmin, uploadPaperMiddleware.single('paper'), uploadPaperValidation, uploadPaper);

// More paper routes using paperId as param
router.put('/papers/:paperId', protect, subadmin, updatePaper);
router.delete('/papers/:paperId', protect, subadmin, deletePaper);

// Generic test series routes - AFTER all specific routes
router.get('/', getTestSeries);
router.get('/fixed-overrides', getFixedSeriesOverrides); // returns overrides (thumbnail etc.) for s1..s4 in one call
router.get('/category/:categoryId', getTestSeriesByCategory);
router.post('/', protect, subadmin, createTestSeriesValidation, createTestSeries);

// Routes with :id param - MUST be last to avoid matching other routes
router.get('/:id', getTestSeriesById);
router.put('/:id', protect, subadmin, updateTestSeriesValidation, updateTestSeries);
router.delete('/:id', protect, subadmin, deleteTestSeries);
router.put('/:id/publish', protect, admin, publishTestSeries);

export default router;
