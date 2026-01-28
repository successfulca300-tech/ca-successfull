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

    // Save metadata to MongoDB
    try {
      // If there's an existing media of the same type, mark it as archived
      if (testSeriesId) {
        const existingMedia = await TestSeriesMedia.findOne({
          testSeriesId,
          mediaType,
          status: 'active',
        });

        if (existingMedia) {
          existingMedia.status = 'archived';
          existingMedia.previousFileId = existingMedia.fileId;
          await existingMedia.save();
        }

        // Create new media document
        const newMedia = new TestSeriesMedia({
          testSeriesId,
          mediaType,
          fileId: response.$id,
          fileUrl,
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
          uploadedBy: req.user._id,
          status: 'active',
        });

        await newMedia.save();
      }
    } catch (dbError) {
      console.error('Error saving media metadata to MongoDB:', dbError);
      // Don't fail the upload if DB save fails, but log the error
    }

    // If testSeriesId is provided, update TestSeries document
    if (testSeriesId) {
      try {
        // testSeriesId might be 's1', 's2', etc. - convert to valid format if needed
        // Check if it's already a valid ObjectId
        let query = {};
        if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
          query._id = testSeriesId;
        } else {
          // Otherwise search by seriesType (S1, S2, S3, S4)
          const seriesTypeMap = { 's1': 'S1', 's2': 'S2', 's3': 'S3', 's4': 'S4' };
          query.seriesType = seriesTypeMap[testSeriesId.toLowerCase()] || testSeriesId;
        }

        let testSeries = await TestSeries.findOne(query);
        
        // Don't try to create with invalid _id - just log and continue
        if (!testSeries) {
          console.warn(`TestSeries not found with query:`, query);
        } else {
          // Check if user has permission (creator or admin)
          if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            console.warn('User does not have permission to update test series');
          } else {
            if (mediaType === 'video') {
              testSeries.videoUrl = fileUrl;
              testSeries.videoFileId = response.$id;
              testSeries.videoType = 'UPLOAD';
            } else if (mediaType === 'image') {
              testSeries.thumbnail = fileUrl;
            }
            await testSeries.save();
          }
        }
      } catch (dbError) {
        console.error('Error updating test series:', dbError);
        // Don't fail the upload if DB update fails
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

    const query = { status: 'active' };

    if (testSeriesId) {
      query.testSeriesId = testSeriesId;
    }

    if (mediaType) {
      query.mediaType = mediaType;
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
