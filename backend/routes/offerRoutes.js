import express from 'express';
import { body } from 'express-validator';
import { protect, admin } from '../middleware/auth.js';
import {
  getOffers,
  getAllOffersAdmin,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
} from '../controllers/offerController.js';

const router = express.Router();

const createOfferValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isNumeric().withMessage('Discount value must be a number'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('code').optional().trim().notEmpty().withMessage('Coupon code cannot be empty').isLength({ min: 3 }).withMessage('Coupon code must be at least 3 characters'),
];

const updateOfferValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('discountType').optional().isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').optional().isNumeric().withMessage('Discount value must be a number'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('code').optional().trim().notEmpty().withMessage('Coupon code cannot be empty').isLength({ min: 3 }).withMessage('Coupon code must be at least 3 characters'),
];

// Public
router.get('/', getOffers);
router.get('/:id', getOfferById);
router.post('/validate-coupon', validateCoupon);

// Admin only
router.get('/admin/all', protect, admin, getAllOffersAdmin);
router.post('/', protect, admin, createOfferValidation, createOffer);
router.put('/:id', protect, admin, updateOfferValidation, updateOffer);
router.delete('/:id', protect, admin, deleteOffer);

export default router;
