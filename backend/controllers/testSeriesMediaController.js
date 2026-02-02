import { Client, Storage, InputFile } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import TestSeries from '../models/TestSeries.js';
import TestSeriesMedia from '../models/TestSeriesMedia.js';
import Category from '../models/Category.js';

/**
 * Upload media file for test series (video, image, etc.)
 * Handles multipart file uploads and stores in Appwrite
 */
export const uploadTestSeriesMedia = async (req, res) => {
  let tempPath = null;
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
    const { name: originalname, size, mimetype } = file;
    tempPath = file.tempFilePath || file.path || null;
    const { mediaType, testSeriesId } = req.body; // 'video' or 'image', optional testSeriesId

    // Validate media type
    if (!mediaType || !['video', 'image'].includes(mediaType)) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({ message: 'Invalid media type. Must be "video" or "image"' });
    }

    // Validate file size based on type
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

    if (mediaType === 'video' && size > MAX_VIDEO_SIZE) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(413).json({
        message: `Video file too large. Maximum ${MAX_VIDEO_SIZE / 1024 / 1024}MB allowed.`
      });
    }

    if (mediaType === 'image' && size > MAX_IMAGE_SIZE) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(413).json({
        message: `Image file too large. Maximum ${MAX_IMAGE_SIZE / 1024 / 1024}MB allowed.`
      });
    }

    // Validate MIME types
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validTypes = mediaType === 'video' ? validVideoTypes : validImageTypes;

    if (!validTypes.includes(mimetype)) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(415).json({
        message: `Invalid ${mediaType} format. MIME type: ${mimetype}`
      });
    }

    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ message: 'Appwrite configuration missing' });
    }

    if (!APPWRITE_BUCKET_ID) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({ message: 'APPWRITE_BUCKET_ID must be set in .env' });
    }

    // Initialize Appwrite client
    const client = new Client();
    client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(client);

    // Generate unique file ID using timestamp and random suffix
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileId = `${mediaType}_${timestamp}_${random}`;

    // Use buffer or path for upload handling
    let inputFile;
    if (file.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
      inputFile = InputFile.fromBuffer(file.data, originalname);
    } else if (tempPath && fs.existsSync(tempPath)) {
      inputFile = InputFile.fromPath(tempPath, originalname);
    } else {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ message: 'Unable to process file' });
    }

    if (!inputFile) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ message: 'Unable to create input file' });
    }

    const response = await storage.createFile(
      APPWRITE_BUCKET_ID,
      fileId,
      inputFile
    );

    if (!response) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new Error('Failed to upload file to Appwrite: no response');
    }

    if (!response.$id) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new Error('Failed to upload file to Appwrite: invalid response');
    }

    // Clean up temp file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Build accessible file URL
    const baseEndpoint = APPWRITE_ENDPOINT.replace(/\/$/, '');
    const endpointWithV1 = baseEndpoint.endsWith('/v1') ? baseEndpoint : `${baseEndpoint}/v1`;
    const fileUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    // Resolve TestSeries up-front so media can be saved against a canonical DB _id
    let originalTestSeriesId = testSeriesId;
    let resolvedTestSeriesId = testSeriesId;
    let resolvedTestSeriesDoc = null;

    if (testSeriesId) {
      // Try to locate existing TestSeries by ObjectId or seriesType
      if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
        resolvedTestSeriesDoc = await TestSeries.findById(testSeriesId);
        if (resolvedTestSeriesDoc) resolvedTestSeriesId = resolvedTestSeriesDoc._id.toString();
      }
      if (!resolvedTestSeriesDoc) {
        const seriesType = testSeriesId.toUpperCase();
        resolvedTestSeriesDoc = await TestSeries.findOne({ seriesType });
        if (resolvedTestSeriesDoc) resolvedTestSeriesId = resolvedTestSeriesDoc._id.toString();
      }

      // Auto-create placeholder TestSeries for recognized shorthand BEFORE saving media
      if (!resolvedTestSeriesDoc && typeof testSeriesId === 'string' && /^s[1-4]$/i.test(testSeriesId)) {
        try {
          // Ensure placeholder category exists
          let category = await Category.findOne({ slug: 'auto-testseries' });
          if (!category) {
            category = await Category.create({ name: 'Auto TestSeries Category', slug: 'auto-testseries', description: 'Auto-created category for placeholder TestSeries' });
          }

          const seriesTypeLabelMap = { 'S1': 'Full Syllabus', 'S2': '50% Syllabus', 'S3': '30% Syllabus', 'S4': 'CA Successful Specials' };

          const placeholderData = {
            title: `${testSeriesId.toUpperCase()} Test Series (Auto-created)`,
            description: `Auto-created placeholder for ${testSeriesId.toUpperCase()}`,
            seriesType: testSeriesId.toUpperCase(),
            seriesTypeLabel: seriesTypeLabelMap[testSeriesId.toUpperCase()] || 'Full Syllabus',
            category: category._id,
            pricing: {},
            subjects: ['FR','AFM','Audit','DT','IDT'],
            createdBy: req.user?._id || null,
            publishStatus: 'published',
            isActive: true,
          };

          resolvedTestSeriesDoc = await TestSeries.create(placeholderData);
          resolvedTestSeriesId = resolvedTestSeriesDoc._id.toString();
          console.log('Auto-created placeholder TestSeries:', resolvedTestSeriesId);
        } catch (createErr) {
          console.error('Failed to auto-create placeholder TestSeries:', createErr);
          // Fall back to using shorthand id as before
          resolvedTestSeriesDoc = null;
          resolvedTestSeriesId = originalTestSeriesId;
        }
      }
    }

    // Save metadata to MongoDB using a transaction to avoid races/duplicate-key errors
    try {
      if (testSeriesId) {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();

          // Cleanup archived docs for both shorthand and resolved ids
          const cleanupIds = Array.from(new Set([originalTestSeriesId, resolvedTestSeriesId]));
          await TestSeriesMedia.deleteMany({ testSeriesId: { $in: cleanupIds }, mediaType, status: 'archived' }).session(session);

          // Archive the currently active media atomically (if exists) matching either representation
          const existingActive = await TestSeriesMedia.findOne({ testSeriesId: { $in: cleanupIds }, mediaType, status: 'active' }).session(session);
          if (existingActive) {
            existingActive.status = 'archived';
            existingActive.previousFileId = existingActive.fileId;
            await existingActive.save({ session });
            console.log(`Archived existing media id=${existingActive._id} for series=${originalTestSeriesId} type=${mediaType}`);
          }

          // Insert the new media document using resolvedTestSeriesId (prefer DB _id when available)
          const newMedia = new TestSeriesMedia({
            testSeriesId: resolvedTestSeriesId,
            mediaType,
            fileId: response.$id,
            fileUrl,
            fileName: originalname,
            fileSize: size,
            mimeType: mimetype,
            uploadedBy: req.user._id,
            status: 'active',
          });

          await newMedia.save({ session });

          await session.commitTransaction();
          console.log('Media metadata saved in transaction, newMediaId=', newMedia._id);

          // Post-transaction: migrate any legacy media docs that used shorthand to the resolved DB id
          if (resolvedTestSeriesDoc && originalTestSeriesId && originalTestSeriesId !== resolvedTestSeriesId) {
            try {
              await TestSeriesMedia.updateMany({ testSeriesId: originalTestSeriesId }, { $set: { testSeriesId: resolvedTestSeriesId } });
              console.log(`Migrated legacy media docs from ${originalTestSeriesId} to ${resolvedTestSeriesId}`);
            } catch (migErr) {
              console.error('Failed to migrate legacy media docs:', migErr);
            }
          }
        } catch (txErr) {
          await session.abortTransaction();
          console.error('Transaction failed when saving media metadata:', txErr);

          // As a fallback, attempt the previous cleanup+retry approach for ALL transaction failures
          try {
            await TestSeriesMedia.deleteMany({ testSeriesId: { $in: [originalTestSeriesId, resolvedTestSeriesId] }, mediaType, status: 'archived' });
            const retryMedia = new TestSeriesMedia({
              testSeriesId: resolvedTestSeriesId,
              mediaType,
              fileId: response.$id,
              fileUrl,
              fileName: originalname,
              fileSize: size,
              mimeType: mimetype,
              uploadedBy: req.user._id,
              status: 'active',
            });
            await retryMedia.save();
            console.log('Fallback retry successful after transaction failure');

            // Attempt migration as well
            if (resolvedTestSeriesDoc && originalTestSeriesId && originalTestSeriesId !== resolvedTestSeriesId) {
              try {
                await TestSeriesMedia.updateMany({ testSeriesId: originalTestSeriesId }, { $set: { testSeriesId: resolvedTestSeriesId } });
                console.log(`Migrated legacy media docs from ${originalTestSeriesId} to ${resolvedTestSeriesId}`);
              } catch (migErr) {
                console.error('Failed to migrate legacy media docs after fallback save:', migErr);
              }
            }
          } catch (retryErr) {
            console.error('Fallback retry also failed:', retryErr);
          }
        } finally {
          session.endSession();
        }
      }
    } catch (dbError) {
      console.error('Error saving media metadata to MongoDB (outer):', dbError);
      // Do not throw - upload succeeded to Appwrite, so we keep going even if DB had problems
    }

    // Update the resolved TestSeries doc (if available) with the new media info so thumbnail/video shows immediately
    if (resolvedTestSeriesDoc) {
      try {
        if (resolvedTestSeriesDoc.createdBy && resolvedTestSeriesDoc.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
          console.warn('User does not have permission to update test series');
        } else {
          if (mediaType === 'video') {
            resolvedTestSeriesDoc.videoUrl = fileUrl;
            resolvedTestSeriesDoc.videoFileId = response.$id;
            resolvedTestSeriesDoc.videoType = 'UPLOAD';
          } else if (mediaType === 'image') {
            resolvedTestSeriesDoc.thumbnail = fileUrl;
          }
          try {
            await resolvedTestSeriesDoc.save();
          } catch (saveErr) {
            console.error('Error saving testSeries after media upload:', saveErr);
          }
        }
      } catch (dbError) {
        console.error('Error updating test series:', dbError);
      }
    } else if (testSeriesId) {
      // Fallback: attempt to update TestSeries by seriesType or _id if resolved doc wasn't found or created
      try {
        let query = {};
        if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
          query._id = testSeriesId;
        } else {
          const seriesTypeMap = { 's1': 'S1', 's2': 'S2', 's3': 'S3', 's4': 'S4' };
          query.seriesType = seriesTypeMap[testSeriesId.toLowerCase()] || testSeriesId;
        }

        let testSeries = await TestSeries.findOne(query);
        if (testSeries) {
          if (testSeries.createdBy && testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            console.warn('User does not have permission to update test series');
          } else {
            if (mediaType === 'video') {
              testSeries.videoUrl = fileUrl;
              testSeries.videoFileId = response.$id;
              testSeries.videoType = 'UPLOAD';
            } else if (mediaType === 'image') {
              testSeries.thumbnail = fileUrl;
            }
            try {
              await testSeries.save();
            } catch (saveErr) {
              console.error('Error saving testSeries after media upload:', saveErr);
            }
          }
        }
      } catch (dbError) {
        console.error('Error updating test series:', dbError);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} uploaded successfully`,
      mediaType,
      url: fileUrl,
      fileId: response.$id,
      file: {
        id: response.$id,
        name: response.name,
        size: response.sizeOriginal,
        mimeType: response.mimeType,
        uploadedAt: response.$createdAt,
      },
    });
  } catch (error) {
    console.error('Media upload error:', error);
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {
        console.error('Failed to cleanup temp file:', e);
      }
    }
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
    });
  }
};

/**
 * Delete media file from Appwrite
 * @param fileId - Appwrite file ID to delete
 */
export const deleteTestSeriesMedia = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
      return res.status(500).json({ message: 'Appwrite configuration missing' });
    }

    // Initialize Appwrite client
    const client = new Client();
    client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(client);

    // Delete file from Appwrite
    await storage.deleteFile(APPWRITE_BUCKET_ID, fileId);

    // Mark media as archived in MongoDB
    try {
      const media = await TestSeriesMedia.findOneAndUpdate(
        { fileId },
        { status: 'archived' },
        { new: true }
      );

      if (!media) {
        console.warn(`Media with fileId ${fileId} not found in MongoDB`);
      }
    } catch (dbError) {
      console.error('Error archiving media in MongoDB:', dbError);
      // Don't fail the operation if DB update fails
    }

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      fileId: fileId,
    });
  } catch (error) {
    console.error('Media deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Deletion failed',
      error: error.message,
    });
  }
};

/**
 * Get media for a specific test series
 * @param testSeriesId - e.g., 's1', 's2', 's3', 's4'
 * @param mediaType - 'thumbnail' or 'video'
 */
export const getTestSeriesMedia = async (req, res) => {
  try {
    const { testSeriesId, mediaType } = req.query;

    const queryBase = { status: 'active' };

    // If testSeriesId provided, match both shorthand and ObjectId representations
    if (testSeriesId) {
      const candidateIds = [testSeriesId];
      if (!mongoose.Types.ObjectId.isValid(testSeriesId)) {
        const tsDoc = await TestSeries.findOne({ seriesType: testSeriesId.toUpperCase() });
        if (tsDoc) candidateIds.push(tsDoc._id.toString());
      } else {
        const tsDoc = await TestSeries.findById(testSeriesId);
        if (tsDoc && tsDoc.seriesType) candidateIds.push(tsDoc.seriesType.toLowerCase());
      }
      queryBase.testSeriesId = { $in: Array.from(new Set(candidateIds)) };
    }

    if (mediaType) {
      queryBase.mediaType = mediaType;
    }

    const media = await TestSeriesMedia.find(queryBase)
      .populate('uploadedBy', 'email firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      media,
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch media',
      error: error.message,
    });
  }
};
