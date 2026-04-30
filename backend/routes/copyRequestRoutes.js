import express from 'express';
import { protect, subadmin, teacher, admin } from '../middleware/auth.js';
import {
  requestMoreCopies,
  getPendingCopyRequests,
  approveCopyRequest,
  denyCopyRequest,
  getTeacherManagementStats,
  updateTeacherRating,
  getTeacherFeedback,
  getTeacherEvaluations,
} from '../controllers/copyRequestController.js';

const router = express.Router();

// Teacher routes
router.post('/request', protect, teacher, requestMoreCopies);
router.get('/teacher/feedback', protect, teacher, getTeacherFeedback);

// SubAdmin routes
router.get('/pending', protect, subadmin, getPendingCopyRequests);
router.put('/:requestId/approve', protect, subadmin, approveCopyRequest);
router.put('/:requestId/deny', protect, subadmin, denyCopyRequest);

// Admin routes
router.get('/admin/teachers-stats', protect, admin, getTeacherManagementStats);
router.put('/admin/teacher/:teacherId/rating', protect, admin, updateTeacherRating);
router.get('/admin/teacher/:teacherId/evaluations', protect, admin, getTeacherEvaluations);

export default router;
