import express from 'express';
import { protect, subadmin } from '../middleware/auth.js';
import {
  uploadTestSeriesMedia,
  deleteTestSeriesMedia,
  getTestSeriesMedia,
} from '../controllers/testSeriesMediaController.js';

const router = express.Router();

/**
 * POST /api/test-series/media/upload
 * Upload media file (video, image) for test series
 * Only subadmin/admin can upload
 */
router.post('/media/upload', protect, subadmin, uploadTestSeriesMedia);

/**
 * GET /api/test-series/media
 * Get media for test series
 * Query params: testSeriesId, mediaType
 */
router.get('/media', getTestSeriesMedia);

/**
 * DELETE /api/test-series/media/:fileId
 * Delete media file from Appwrite
 * Only subadmin/admin can delete
 */
router.delete('/media/:fileId', protect, subadmin, deleteTestSeriesMedia);

export default router;
