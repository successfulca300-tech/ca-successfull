import express from 'express';
import { body } from 'express-validator';
import { protect, admin } from '../middleware/auth.js';
import {
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  moderateTestimonial,
} from '../controllers/testimonialController.js';

const router = express.Router();

const createTestimonialValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required'),
  body('courseId').optional().trim(),
];

const updateTestimonialValidation = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().notEmpty().withMessage('Comment cannot be empty'),
];

// Public
router.get('/', getTestimonials);
router.get('/:id', getTestimonialById);

// Protected - user
router.post('/', protect, createTestimonialValidation, createTestimonial);
router.put('/:id', protect, updateTestimonialValidation, updateTestimonial);
router.delete('/:id', protect, deleteTestimonial);

// Admin only
router.put('/:id/moderate', protect, admin, moderateTestimonial);

export default router;
