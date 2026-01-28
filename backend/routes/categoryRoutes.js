import express from 'express';
import { body } from 'express-validator';
import { protect, admin, subadmin } from '../middleware/auth.js';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = express.Router();

const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('icon').optional().trim(),
];

const updateCategoryValidation = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
  body('icon').optional().trim(),
];

// Public
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin or Sub-Admin allowed to manage categories
router.post('/', protect, subadmin, createCategoryValidation, createCategory);
router.put('/:id', protect, subadmin, updateCategoryValidation, updateCategory);
router.delete('/:id', protect, subadmin, deleteCategory);

export default router;
