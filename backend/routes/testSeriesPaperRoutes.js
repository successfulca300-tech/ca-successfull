import express from 'express';
import { body } from 'express-validator';
import { protect, subadmin } from '../middleware/auth.js';
import uploadPaperMiddleware from '../config/multer.js';
import {
  uploadPaper,
  getPapersByTestSeries,
  getPapersGroupedBySubject,
  getMyPapers,
  updatePaper,
  deletePaper,
  getPapersSummary,
} from '../controllers/testSeriesPaperController.js';

const router = express.Router();

const uploadPaperValidation = [
  body('group').isIn(['Group 1', 'Group 2', 'Both']).withMessage('Valid group is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('paperType').isIn(['question', 'suggested', 'evaluated']).withMessage('Valid paper type is required'),
  body('paperNumber').isInt({ min: 1 }).withMessage('Paper number must be a positive integer'),
  body('syllabusPercentage').isIn(['100%', '50%', '30%']).withMessage('Valid syllabus percentage is required'),
];

// Public/Protected based on need
router.get('/:testSeriesId/papers', getPapersByTestSeries);
router.get('/:testSeriesId/papers/grouped', protect, getPapersGroupedBySubject);
router.get('/:testSeriesId/papers-summary', getPapersSummary);

// Protected - SubAdmin
router.post('/:testSeriesId/papers', protect, subadmin, uploadPaperMiddleware.single('paper'), uploadPaperValidation, uploadPaper);
router.get('/subadmin/my-papers', protect, subadmin, getMyPapers);
router.put('/papers/:paperId', protect, subadmin, updatePaper);
router.delete('/papers/:paperId', protect, subadmin, deletePaper);

export default router;
