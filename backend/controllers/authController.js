import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { validationResult } from 'express-validator';
import { validatePhone } from '../utils/validatePhone.js';
import crypto from 'crypto';
// import sendVerificationEmail from '../utils/sendVerificationEmail.js';
import sendOTPEmail, { sendPasswordResetOTP } from '../utils/email.js';

const ATTEMPT_OPTIONS = ['May 26', 'Sept 26', 'Jan 26'];
const LEVEL_OPTIONS = ['CA Inter', 'CA Final'];
const PREPARING_FOR_OPTIONS = ['Group 1', 'Group 2', 'Both Groups'];

/* =================================
   REGISTER
================================= */
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, phone, attempt, level, preparingFor, address } = req.body;

    // Validate phone number
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ message: phoneValidation.message });
    }
    if (!ATTEMPT_OPTIONS.includes(attempt)) {
      return res.status(400).json({ message: 'Please select a valid attempt' });
    }
    if (!LEVEL_OPTIONS.includes(level)) {
      return res.status(400).json({ message: 'Please select a valid level' });
    }
    if (!PREPARING_FOR_OPTIONS.includes(preparingFor)) {
      return res.status(400).json({ message: 'Please select what you are preparing for' });
    }

    const normalizedAddress = typeof address === 'string' ? address.trim() : '';
    if (!normalizedAddress) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log('Generated OTP for', email, ':', otp);

    const user = await User.create({
      name,
      email,
      phone,
      password,
      attempt,
      level,
      preparingFor,
      address: {
        street: normalizedAddress,
        country: 'India',
      },
      role: role || 'user',
      isVerified: false,
      emailOTP: otp,
      otpExpiry
    });

    console.log('User created with OTP:', user.emailOTP);

    await sendOTPEmail(user.email, otp);

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      userId: user._id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


/* =================================
   VERIFY OTP
================================= */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      emailOTP: otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.emailOTP = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

/* =================================
   LOGIN
================================= */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =================================
   GET CURRENT USER
================================= */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/* =================================
   FORGOT PASSWORD (SEND OTP)
================================= */
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    await sendPasswordResetOTP(user.email, otp);

    res.json({ message: 'OTP sent to email successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =================================
   RESET PASSWORD (VERIFY OTP)
================================= */
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = password;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
