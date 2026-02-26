import { Client, Storage, InputFile } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import TestSeries from '../models/TestSeries.js';
import TestSeriesMedia from '../models/TestSeriesMedia.js';

/**
 * Upload media file for test series (video, image, etc.)
 * Handles multipart file uploads and stores in Appwrite
 */
export const uploadTestSeriesMedia = async (req, res) => {
  let tempPath = null;
    let dbSaved = false;
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

    // Save metadata to MongoDB (resolve or create TestSeries entry and mark new media as 'published')
      try {
      if (testSeriesId) {
        // Resolve testSeriesId param to DB TestSeries
        let testSeries = null;
        // 1) Try as ObjectId
        if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
          testSeries = await TestSeries.findById(testSeriesId);
        }
        // 2) Try fixedKey (case-insensitive) match
        if (!testSeries) {
          testSeries = await TestSeries.findOne({ fixedKey: { $regex: `^${testSeriesId}$`, $options: 'i' } });
        }
        // 3) Try plain seriesType like 'S1','S2' etc. BUT if incoming id has a prefix (e.g., 'inter-s1')
        // prefer creating/using a managed fixedKey document instead of attaching to the generic seriesType doc.
        if (!testSeries) {
          const upper = String(testSeriesId || '').toUpperCase();
          const hasPrefix = String(testSeriesId || '').includes('-');
          if (['S1', 'S2', 'S3', 'S4'].includes(upper)) {
            // Only use the shared seriesType doc when the incoming id is exactly 's1' (no prefix)
            if (!hasPrefix) {
              testSeries = await TestSeries.findOne({ seriesType: upper });
              if (!testSeries) {
                testSeries = await TestSeries.create({
                  title: `Test Series ${upper}`,
                  seriesType: upper,
                  seriesTypeLabel: upper === 'S1' ? 'Full Syllabus' : upper === 'S2' ? '50% Syllabus' : upper === 'S3' ? '30% Syllabus' : 'CA Successful Specials',
                  category: null,
                  createdBy: req.user._id,
                  publishStatus: 'published',
                  isActive: true,
                  fixedKey: upper,
                  examLevel: 'final',
                });
              }
            }
          }
        }

        // 4) Try to extract trailing s1..s4 from values like 'inter-s1'. For prefixed ids we MUST create or upsert
        // a managed TestSeries with fixedKey=testSeriesId so media binds to the prefixed (inter/final) entry.
        if (!testSeries) {
          const m = String(testSeriesId || '').match(/(s[1-4])$/i);
          if (m) {
            const seriesType = m[1].toUpperCase();
            const hasPrefix = String(testSeriesId || '').includes('-');
            if (hasPrefix) {
              // Try to find by fixedKey (case-insensitive) and create if missing
              testSeries = await TestSeries.findOne({ fixedKey: { $regex: `^${testSeriesId}$`, $options: 'i' } });
              if (!testSeries) {
                const derivedExamLevel = String(testSeriesId || '').toLowerCase().startsWith('inter-') ? 'inter' : 'final';
                testSeries = await TestSeries.create({
                  title: `Test Series ${seriesType}`,
                  seriesType,
                  seriesTypeLabel: seriesType === 'S1' ? 'Full Syllabus' : seriesType === 'S2' ? '50% Syllabus' : seriesType === 'S3' ? '30% Syllabus' : 'CA Successful Specials',
                  category: null,
                  createdBy: req.user._id,
                  publishStatus: 'published',
                  isActive: true,
                  fixedKey: testSeriesId,
                  examLevel: derivedExamLevel,
                });
              }
            } else {
              // No prefix: fall back to seriesType doc if present
              testSeries = await TestSeries.findOne({ seriesType });
              if (!testSeries) {
                testSeries = await TestSeries.create({
                  title: `Test Series ${seriesType}`,
                  seriesType,
                  seriesTypeLabel: seriesType === 'S1' ? 'Full Syllabus' : seriesType === 'S2' ? '50% Syllabus' : seriesType === 'S3' ? '30% Syllabus' : 'CA Successful Specials',
                  category: null,
                  createdBy: req.user._id,
                  publishStatus: 'published',
                  isActive: true,
                  fixedKey: testSeriesId,
                  examLevel: 'final',
                });
              }
            }
          }
        }

        if (testSeries) {
          // Normalize incoming mediaType ('image' -> 'thumbnail')
          const normalizedMediaType = mediaType === 'image' ? 'thumbnail' : mediaType;

          // Archive any existing published media of the same normalized type
          // NOTE: Some existing DBs may have an incorrect unique index on (testSeriesId, mediaType, status),
          // which can cause a duplicate-key error when archiving. To be robust, remove any previous archived
          // entries first so archiving the current published item does not violate such an index.
          await TestSeriesMedia.deleteMany({ testSeriesId: testSeries._id, mediaType: normalizedMediaType, status: 'archived' });

          const existingMedia = await TestSeriesMedia.findOne({
            testSeriesId: testSeries._id,
            mediaType: normalizedMediaType,
            status: 'published',
          });

          if (existingMedia) {
            existingMedia.previousFileId = existingMedia.fileId;
            existingMedia.status = 'archived';
            await existingMedia.save();
          }

          // Create new media document as published
          const newMedia = new TestSeriesMedia({
            testSeriesId: testSeries._id,
            mediaType: normalizedMediaType,
            fileId: response.$id,
            fileUrl,
            fileName: originalname,
            fileSize: size,
            mimeType: mimetype,
            uploadedBy: req.user._id,
            uploadedByRole: req.user.role || 'subadmin',
            status: 'published',
          });

          try {
            await newMedia.save();
            dbSaved = true;
            console.info(`Media saved to MongoDB: mediaId=${newMedia._id}, fileId=${response.$id}, testSeriesId=${testSeries._id}, mediaType=${normalizedMediaType}`);
          } catch (saveErr) {
            console.error('Failed to save TestSeriesMedia:', saveErr);
            // attempt to clean up any saved archived docs left behind
            try { await TestSeriesMedia.deleteMany({ testSeriesId: testSeries._id, mediaType: normalizedMediaType, status: 'archived' }); } catch (e) {}
            throw saveErr;
          }
        } else {
          console.warn(`TestSeries not found or auto-creation failed for id '${testSeriesId}'. Media metadata was not saved to MongoDB.`);
        }
      }
    } catch (dbError) {
      console.error('Error saving media metadata to MongoDB:', dbError);
      // Don't fail the upload if DB save fails, but log the error
    }

    // If testSeriesId is provided, update TestSeries document (use resolved DB doc if exists)
    if (testSeriesId) {
      try {
        let testSeries = null;
        // 1) Try as ObjectId
        if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
          testSeries = await TestSeries.findById(testSeriesId);
        }
        // 2) Try fixedKey (case-insensitive) match
        if (!testSeries) {
          testSeries = await TestSeries.findOne({ fixedKey: { $regex: `^${testSeriesId}$`, $options: 'i' } });
        }
        // 3) Try plain seriesType like 'S1','S2' etc.
        if (!testSeries) {
          const upper = String(testSeriesId || '').toUpperCase();
          if (['S1', 'S2', 'S3', 'S4'].includes(upper)) {
            testSeries = await TestSeries.findOne({ seriesType: upper });
              if (!testSeries) {
              testSeries = await TestSeries.create({
                title: `Test Series ${upper}`,
                seriesType: upper,
                seriesTypeLabel: upper === 'S1' ? 'Full Syllabus' : upper === 'S2' ? '50% Syllabus' : upper === 'S3' ? '30% Syllabus' : 'CA Successful Specials',
                category: null,
                createdBy: req.user._id,
                publishStatus: 'published',
                isActive: true,
                fixedKey: upper,
                examLevel: 'final',
              });
            }
          }
        }

        // 4) Try to extract trailing s1..s4 from values like 'inter-s1' and create a managed doc with fixedKey
        if (!testSeries) {
          const m = String(testSeriesId || '').match(/(s[1-4])$/i);
          if (m) {
            const seriesType = m[1].toUpperCase();
            testSeries = await TestSeries.findOne({ seriesType });
              if (!testSeries) {
              const derivedExamLevel = String(testSeriesId || '').toLowerCase().startsWith('inter-') ? 'inter' : 'final';
              testSeries = await TestSeries.create({
                title: `Test Series ${seriesType}`,
                seriesType,
                seriesTypeLabel: seriesType === 'S1' ? 'Full Syllabus' : seriesType === 'S2' ? '50% Syllabus' : seriesType === 'S3' ? '30% Syllabus' : 'CA Successful Specials',
                category: null,
                createdBy: req.user._id,
                publishStatus: 'published',
                isActive: true,
                fixedKey: testSeriesId,
                examLevel: derivedExamLevel,
              });
            }
          }
        }

        if (testSeries) {
          // Check permission: allow update if creator or admin
          if (testSeries.createdBy && testSeries.createdBy.toString && testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            console.warn('User does not have permission to update test series');
          } else {
            const normalizedMediaType = mediaType === 'image' ? 'thumbnail' : mediaType;
            if (normalizedMediaType === 'video') {
              testSeries.videoUrl = fileUrl;
              testSeries.videoFileId = response.$id;
              testSeries.videoType = 'UPLOAD';
            } else if (normalizedMediaType === 'thumbnail') {
              // Set both thumbnail and cardThumbnail to ensure frontend shows the image
              testSeries.thumbnail = fileUrl;
              testSeries.cardThumbnail = fileUrl;
            }
            // Ensure fixedKey set for non-ObjectId ids
            if (!testSeries.fixedKey && !mongoose.Types.ObjectId.isValid(testSeriesId)) {
              testSeries.fixedKey = testSeriesId;
            }
            await testSeries.save();
          }
        } else {
          console.warn(`TestSeries not found or auto-creation failed for id '${testSeriesId}'. TestSeries document was not updated with media info.`);
        }
      } catch (dbError) {
        console.error('Error updating test series:', dbError);
        // Don't fail the upload if DB update fails
      }
    }

    const responseMediaType = mediaType === 'image' ? 'thumbnail' : mediaType;
    return res.status(201).json({
      success: true,
      message: `${responseMediaType.charAt(0).toUpperCase() + responseMediaType.slice(1)} uploaded successfully`,
      mediaType: responseMediaType,
      url: fileUrl,
      fileId: response.$id,
      dbSaved,
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
      // Ensure we don't violate an existing unique index on (testSeriesId, mediaType, status)
      // by removing any prior archived documents for the same series/type first.
      const current = await TestSeriesMedia.findOne({ fileId });
      if (current) {
        await TestSeriesMedia.deleteMany({ testSeriesId: current.testSeriesId, mediaType: current.mediaType, status: 'archived' });
      }

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

    const query = { status: 'published' };

    if (testSeriesId) {
      // Resolve fixedKey (case-insensitive), ObjectId, or plain seriesType to TestSeries _id
      let resolved = null;
      // 1) Try as ObjectId
      if (mongoose.Types.ObjectId.isValid(String(testSeriesId))) {
        resolved = await TestSeries.findById(testSeriesId);
      }

      // 2) Try fixedKey (case-insensitive)
      if (!resolved) {
        resolved = await TestSeries.findOne({ fixedKey: { $regex: `^${String(testSeriesId || '')}$`, $options: 'i' } });
      }

      // 3) If still not found, handle plain seriesType WITHOUT prefix (e.g., 's1')
      if (!resolved) {
        const seriesType = String(testSeriesId || '').toUpperCase();
        const hasPrefix = String(testSeriesId || '').includes('-');
        if (['S1', 'S2', 'S3', 'S4'].includes(seriesType) && !hasPrefix) {
          resolved = await TestSeries.findOne({ seriesType });
        }
      }

      if (resolved) query.testSeriesId = resolved._id;
      else return res.status(200).json({ success: true, media: [] });
    }

    if (mediaType) {
      const normalized = String(mediaType) === 'image' ? 'thumbnail' : String(mediaType);
      query.mediaType = normalized;
    }

    const media = await TestSeriesMedia.find(query)
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
