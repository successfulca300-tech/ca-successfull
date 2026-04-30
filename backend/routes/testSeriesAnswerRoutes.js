import express from 'express';
import { protect, subadmin, teacher, teacherOrSubadmin } from '../middleware/auth.js';
import uploadPaperMiddleware from '../config/multer.js';
import {
  uploadAnswerSheet,
  getMyAnswers,
  getAllAnswerSheets,
  uploadEvaluatedSheet,
  getPaperStatistics,
  getMyAnswerForPaper,
  assignAnswerToTeacher,
  getTeacherAssignedAnswers,
  uploadTeacherEvaluatedSheet,
  getTeachersList
} from '../controllers/testSeriesAnswerController.js';

const router = express.Router();

// IMPORTANT: Specific routes FIRST, then parameterized routes

// Public routes (most specific)
router.get('/papers/:paperId/statistics', getPaperStatistics);

// Subadmin specific routes
router.get('/subadmin/all', protect, subadmin, getAllAnswerSheets);
router.get('/teachers/list', protect, subadmin, getTeachersList);

// Teacher specific routes
router.get('/teacher/assigned', protect, teacher, getTeacherAssignedAnswers);

// User routes (parameterized)
router.post('/upload', protect, uploadPaperMiddleware.single('answerSheet'), uploadAnswerSheet);
router.get('/:testSeriesId/my', protect, getMyAnswers);
router.get('/papers/:paperId/my', protect, getMyAnswerForPaper);

// Parameterized routes (least specific - must be last)
router.post('/:answerId/evaluated', protect, subadmin, uploadPaperMiddleware.single('evaluatedSheet'), uploadEvaluatedSheet);
router.post('/:answerId/assign-teacher', protect, subadmin, assignAnswerToTeacher);
router.post('/:answerId/teacher-evaluated', protect, teacher, uploadPaperMiddleware.single('evaluatedSheet'), uploadTeacherEvaluatedSheet);

export default router;


