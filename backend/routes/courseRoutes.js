import express from 'express';
import { body } from 'express-validator';
import { protect, admin, subadmin } from '../middleware/auth.js';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getCoursesByCategory,
  addCourseReview,
  addChapter,
  updateChapter,
  deleteChapter,
  addChapterItem,
  updateChapterItem,
  deleteChapterItem,
  uploadChapterItem,
} from '../controllers/courseController.js';
import multer from 'multer';

const router = express.Router();

// multer setup for this router (stores temp files in backend/uploads)
const upload = multer({ dest: 'uploads/' });

const createCourseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
];

const updateCourseValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
];

// Public
router.get('/', getCourses);
router.get('/category/:categoryId', getCoursesByCategory);
router.get('/:id', getCourseById);

// Protected - user
router.post('/:id/reviews', protect, addCourseReview);

// Protected - subadmin/admin
router.post('/', protect, subadmin, createCourseValidation, createCourse);
router.put('/:id', protect, subadmin, updateCourseValidation, updateCourse);
router.delete('/:id', protect, subadmin, deleteCourse);

// Chapters
router.post('/:id/chapters', protect, subadmin, addChapter);
router.put('/:id/chapters/:chapterId', protect, subadmin, updateChapter);
router.delete('/:id/chapters/:chapterId', protect, subadmin, deleteChapter);
router.post('/:id/chapters/:chapterId/items', protect, subadmin, addChapterItem);
router.put('/:id/chapters/:chapterId/items/:itemId', protect, subadmin, updateChapterItem);
router.delete('/:id/chapters/:chapterId/items/:itemId', protect, subadmin, deleteChapterItem);
// Upload & attach file to chapter (multipart/form-data: field name 'file')
router.post('/:id/chapters/:chapterId/items/upload', protect, subadmin, uploadChapterItem);

// Admin only
router.put('/:id/publish', protect, admin, publishCourse);

export default router;
