import express from 'express';
import { body } from 'express-validator';
import {
  getResources,
  getAllResourcesAdmin,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourcesByCategory,
  getUserResources,
} from '../controllers/resourceController.js';
import { protect, subadmin, admin } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createResourceValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('type')
    .optional()
    .isIn(['document', 'video', 'link', 'file', 'other'])
    .withMessage('Invalid resource type'),
  body('url').optional().isURL().withMessage('Please provide a valid URL'),
];

const updateResourceValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('type')
    .optional()
    .isIn(['document', 'video', 'link', 'file', 'other'])
    .withMessage('Invalid resource type'),
  body('url').optional().isURL().withMessage('Please provide a valid URL'),
];

// Public routes (no authentication required)
router.get('/', getResources);
router.get('/category/:category', getResourcesByCategory);
router.get('/admin/all', protect, admin, getAllResourcesAdmin);

// Protected routes (authentication required)
router.get('/user', protect, getUserResources);
// File uploads don't work well with express-validator middleware for FormData
// So we'll validate manually in the controller
router.post('/', protect, subadmin, createResource);
router.put('/:id', protect, updateResourceValidation, updateResource);
router.delete('/:id', protect, deleteResource);
router.get('/:id', getResourceById);

export default router;

