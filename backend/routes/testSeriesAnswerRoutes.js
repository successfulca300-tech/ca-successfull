import express from 'express';
import { protect, subadmin } from '../middleware/auth.js';
import uploadPaperMiddleware from '../config/multer.js';
import {
  uploadAnswerSheet,
  getMyAnswers,
  getAllAnswerSheets,
  uploadEvaluatedSheet,
  getPaperStatistics,
  getMyAnswerForPaper
} from '../controllers/testSeriesAnswerController.js';

const router = express.Router();

// User routes
router.post('/upload', protect, uploadPaperMiddleware.single('answerSheet'), uploadAnswerSheet);
router.get('/:testSeriesId/my', protect, getMyAnswers);
router.get('/papers/:paperId/my', protect, getMyAnswerForPaper);

// Public routes
router.get('/papers/:paperId/statistics', getPaperStatistics);

// Subadmin routes
router.get('/subadmin/all', protect, subadmin, getAllAnswerSheets);
router.post('/:answerId/evaluated', protect, subadmin, uploadPaperMiddleware.single('evaluatedSheet'), uploadEvaluatedSheet);

export default router;

