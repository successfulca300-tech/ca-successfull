import express from 'express';
import { proxyFileView, generateFileViewToken, publicFileProxy } from '../controllers/fileViewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Proxy view by token (public token used in URL)
router.get('/view/:token', proxyFileView);

// Generate a short-lived view token for a file (restricted)
router.post('/token', protect, generateFileViewToken);

// Public proxy endpoint for images/previews (no auth) - pass fileId or fileUrl as query param
router.get('/public', publicFileProxy);

export default router;
