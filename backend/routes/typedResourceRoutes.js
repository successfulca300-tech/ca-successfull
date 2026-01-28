import express from 'express';
import {
  createTypedResource,
  approveResource,
  rejectResource,
  getPendingResources,
  getPublishedResourcesByType,
} from '../controllers/typedResourceController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/published/:resourceCategory', getPublishedResourcesByType);

// Admin routes
router.get('/pending', protect, admin, getPendingResources);
router.put('/:id/approve', protect, admin, approveResource);
router.put('/:id/reject', protect, admin, rejectResource);

// Protected routes (authenticated users)
router.post('/create-typed', protect, createTypedResource);

export default router;
