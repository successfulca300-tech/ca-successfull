/**
 * Multer Configuration for File Uploads
 * Handles PDF, image, and document uploads for test series papers
 */

import multer from 'multer';
import path from 'path';

// Create memory storage (files stored in memory before upload to Appwrite)
const memoryStorage = multer.memoryStorage();

// File filter - allow only PDFs and documents
const fileFilter = (req, file, cb) => {
  console.log('[multer fileFilter] File received:', file.originalname, 'MIME:', file.mimetype);
  
  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
  ];

  // Allowed file extensions
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp', '.txt'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (allowedExtensions.includes(ext) && allowedTypes.includes(mimeType)) {
    console.log('[multer fileFilter] ✓ File accepted:', file.originalname);
    cb(null, true);
  } else {
    const error = new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    console.error('[multer fileFilter] ✗ File rejected:', file.originalname, error.message);
    cb(error, false);
  }
};

// Multer instance for paper uploads
const uploadPaperMiddleware = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
});

export default uploadPaperMiddleware;

/**
 * Usage in routes:
 * router.post('/:testSeriesId/papers', protect, subadmin, uploadPaperMiddleware.single('paper'), uploadPaper);
 */
