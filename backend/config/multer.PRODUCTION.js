/**
 * Multer Configuration - Production Ready
 * Paper Upload: PDF only, 20MB max, memory storage for Appwrite upload
 */

import multer from 'multer';
import path from 'path';

// Memory storage - files stored in RAM before upload to Appwrite
const storage = multer.memoryStorage();

/**
 * File filter for PDF only
 * - Validates MIME type
 * - Validates file extension
 * - Rejects all other file types
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeType = 'application/pdf';
  const allowedExtension = '.pdf';

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fileMimeType = file.mimetype;

  console.log(`[Multer] File received: ${file.originalname}`);
  console.log(`[Multer] MIME type: ${fileMimeType}, Extension: ${fileExtension}`);

  // Check MIME type AND extension
  if (fileMimeType === allowedMimeType && fileExtension === allowedExtension) {
    console.log(`[Multer] File accepted: ${file.originalname}`);
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type. Only PDF files are allowed. ` +
      `Received: ${fileExtension || 'unknown'} (${fileMimeType || 'unknown type'})`
    );
    console.warn(`[Multer] File rejected: ${error.message}`);
    cb(error, false);
  }
};

/**
 * Multer instance for paper uploads
 * - Accepts single file named 'paper'
 * - Max size: 20MB
 * - Only PDFs allowed
 * - Stores in memory
 */
const uploadPaperMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

/**
 * Error handling middleware for multer errors
 * Wraps multer middleware to catch and format errors nicely
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer specific errors
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is 20MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // Custom file filter errors
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

export default uploadPaperMiddleware;

/**
 * Usage in routes:
 * 
 * import uploadPaperMiddleware, { handleUploadError } from '../config/multer.js';
 * 
 * router.post(
 *   '/:testSeriesId/papers',
 *   protect,
 *   subadmin,
 *   (req, res, next) => uploadPaperMiddleware.single('paper')(req, res, (err) => handleUploadError(err, req, res, next)),
 *   uploadPaper
 * );
 * 
 * OR simply:
 * 
 * router.post(
 *   '/:testSeriesId/papers',
 *   protect,
 *   subadmin,
 *   uploadPaperMiddleware.single('paper'),
 *   uploadPaper
 * );
 */
