import express from 'express';
import { body } from 'express-validator';
import { protect, admin, subadmin } from '../middleware/auth.js';
import {
  getBooks,
  getBookById,
  getBooksByCategory,
} from '../controllers/bookController.js';

const router = express.Router();

// Public routes
router.get('/', getBooks);
router.get('/category/:categoryId', getBooksByCategory);
router.get('/:id', getBookById);

export default router;
