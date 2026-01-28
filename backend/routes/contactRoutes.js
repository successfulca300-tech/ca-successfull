import express from 'express';
import { body } from 'express-validator';
import { createContact, getContacts, updateContactStatus } from '../controllers/contactController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/contact
// @desc    Create contact message
// @access  Public
router.post(
  '/',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('subject', 'Subject is required').not().isEmpty(),
    body('message', 'Message is required').not().isEmpty(),
  ],
  createContact
);

// @route   GET /api/contact
// @desc    Get all contact messages
// @access  Private/Admin
router.get('/', protect, admin, getContacts);

// @route   PUT /api/contact/:id
// @desc    Update contact status
// @access  Private/Admin
router.put('/:id', protect, admin, updateContactStatus);

export default router;
