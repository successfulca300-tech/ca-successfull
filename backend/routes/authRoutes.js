import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  verifyOTP,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('attempt')
    .isIn(['May 26', 'Sept 26', 'Jan 26'])
    .withMessage('Please select a valid attempt'),
  body('level')
    .isIn(['CA Inter', 'CA Final'])
    .withMessage('Please select a valid level'),
  body('preparingFor')
    .isIn(['Group 1', 'Group 2', 'Both Groups'])
    .withMessage('Please select what you are preparing for'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
], forgotPassword);
router.post('/reset-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], resetPassword);
router.get('/me', protect, getMe);

export default router;
