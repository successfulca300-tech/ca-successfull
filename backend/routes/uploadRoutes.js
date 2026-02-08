import express from 'express';
import multer from 'multer';
import { protect, subadmin } from '../middleware/auth.js';
import { uploadFile, testUpload } from '../controllers/uploadController.js';

const router = express.Router();

// multer setup: store in temp uploads folder
const upload = multer({ dest: 'uploads/' });

// POST /api/upload - only subadmin/admin can upload
router.post('/', protect, subadmin, upload.single('file'), uploadFile);

// POST /api/upload/test - public test endpoint to accept a single file and save locally (no auth)
// No multer needed - express-fileupload applies globally and populates req.files
router.post('/test', testUpload);

// Proxy GET /api/upload/thumbnail/:fileId - serve thumbnail bytes via backend (uses Appwrite API key)
router.get('/thumbnail/:fileId', async (req, res) => {
	// delegate to controller
	const { getThumbnail } = await import('../controllers/uploadController.js');
	return getThumbnail(req, res);
});

export default router;
