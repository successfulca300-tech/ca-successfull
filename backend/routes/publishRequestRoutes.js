import express from 'express';
import { body } from 'express-validator';
import { protect, admin } from '../middleware/auth.js';
import {
  getPublishRequests,
  getPublishRequestById,
  getUserPublishRequests,
  createPublishRequest,
  moderatePublishRequest,
  deletePublishRequest,
} from '../controllers/publishRequestController.js';

const router = express.Router();

const createPublishRequestValidation = [
  body('contentType').isIn(['course', 'testSeries', 'resource']).withMessage('Invalid content type'),
  body('contentId').trim().notEmpty().withMessage('Content ID is required'),
  body('requestNotes').optional().trim(),
];

const moderatePublishRequestValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Invalid action'),
  body('rejectionReason').optional().trim(),
];

// Admin only - view all requests
router.get('/', protect, admin, getPublishRequests);
// Get requests for current user
router.get('/user', protect, getUserPublishRequests);
router.get('/:id', protect, admin, getPublishRequestById);

// Protected - subadmin/user can create
router.post('/', protect, createPublishRequestValidation, createPublishRequest);
router.delete('/:id', protect, deletePublishRequest);

// Admin only - moderate
router.put('/:id/moderate', protect, admin, moderatePublishRequestValidation, moderatePublishRequest);

export default router;
