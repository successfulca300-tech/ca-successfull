import express from 'express';
import { body } from 'express-validator';
import { protect, admin } from '../middleware/auth.js';
import {
  getEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  checkEnrollment,
} from '../controllers/enrollmentController.js';

const router = express.Router();

const createEnrollmentValidation = [
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
];

const updateEnrollmentValidation = [
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('progress').optional().isNumeric().custom((v) => v >= 0 && v <= 100).withMessage('Progress must be between 0 and 100'),
];

// Protected - user
router.get('/', protect, getEnrollments);
router.post('/', protect, createEnrollmentValidation, createEnrollment);
router.get('/check', protect, checkEnrollment);
router.get('/:id', protect, getEnrollmentById);
router.put('/:id', protect, updateEnrollmentValidation, updateEnrollment);

// Admin only
router.delete('/:id', protect, admin, deleteEnrollment);

export default router;
