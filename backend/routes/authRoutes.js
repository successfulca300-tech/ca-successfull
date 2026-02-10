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
