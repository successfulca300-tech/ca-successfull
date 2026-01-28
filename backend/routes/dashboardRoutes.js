import express from 'express';
import { body } from 'express-validator';
import { protect, admin } from '../middleware/auth.js';
import {
  getDashboardStats,
  getRecentEnrollments,
  getPendingPublishRequests,
  getPendingTestimonials,
  getAllUsers,
  updateUserByAdmin,
  getContentOverview,
} from '../controllers/dashboardController.js';

const router = express.Router();

// All dashboard routes require admin access
router.use(protect, admin);

router.get('/stats', getDashboardStats);
router.get('/enrollments', getRecentEnrollments);
router.get('/pending-requests', getPendingPublishRequests);
router.get('/pending-testimonials', getPendingTestimonials);
router.get('/content-overview', getContentOverview);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserByAdmin);

export default router;
