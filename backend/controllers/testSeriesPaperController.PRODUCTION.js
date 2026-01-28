/**
 * Paper Upload Controller - Production Ready
 * Handles PDF uploads to Appwrite with proper validation and error handling
 */

import TestSeriesPaper from '../models/TestSeriesPaper.js';
import TestSeries from '../models/TestSeries.js';
import { uploadFileToAppwrite, deleteFileFromAppwrite } from '../utils/appwriteFileService.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * @desc    Upload test series question paper
 * @route   POST /api/testseries/:testSeriesId/papers
 * @access  Private/SubAdmin
 * @body    { group, subject, paperType, paperNumber, syllabusPercentage, paperTitle }
 * @file    paper (PDF file)
 */
export const uploadPaper = async (req, res) => {
  let appwriteFileId = null;

  try {
    // Validate input
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a PDF file.'
      });
    }

    const { testSeriesId } = req.params;
    const { group, subject, paperType, paperNumber = 1, syllabusPercentage = '100%', paperTitle } = req.body;

    // Validate required fields
    if (!group || !subject || !paperType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: group, subject, paperType'
      });
    }

    // Validate file is PDF only
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed. Received: ' + req.file.mimetype
      });
    }

    // Validate file size (20MB max)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is 20MB, received ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`
      });
    }

    // Check if test series exists
    const testSeries = await TestSeries.findById(testSeriesId);
    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    // Check authorization - user must be the creator or admin
    if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload papers for this test series'
      });
    }

    console.log(`[PaperUpload] Uploading PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload to Appwrite
    let appwriteResponse;
    try {
      appwriteResponse = await uploadFileToAppwrite(
        req.file.buffer,
        req.file.originalname,
        'application/pdf'
      );
      appwriteFileId = appwriteResponse.fileId;
      console.log(`[PaperUpload] Appwrite upload successful. File ID: ${appwriteFileId}`);
    } catch (appwriteError) {
      console.error(`[PaperUpload] Appwrite upload failed:`, appwriteError.message);
      return res.status(503).json({
        success: false,
        message: `Failed to upload file to cloud storage: ${appwriteError.message}`
      });
    }

    // Save to MongoDB
    let paper;
    try {
      paper = await TestSeriesPaper.create({
        testSeriesId,
        group,
        subject,
        paperType,
        paperNumber: parseInt(paperNumber) || 1,
        syllabusPercentage,
        fileName: req.file.originalname,
        appwriteFileId: appwriteResponse.fileId,
        appwriteBucketId: appwriteResponse.bucketId,
        publicFileUrl: appwriteResponse.publicFileUrl,
        fileSizeBytes: req.file.size,
        availabilityDate: new Date(),
        isAvailable: true,
        createdBy: req.user._id
      });

      console.log(`[PaperUpload] Paper record created. ID: ${paper._id}`);
    } catch (dbError) {
      // Clean up Appwrite file if DB save fails
      if (appwriteFileId) {
        try {
          await deleteFileFromAppwrite(appwriteFileId);
          console.log(`[PaperUpload] Cleaned up Appwrite file after DB error`);
        } catch (cleanupError) {
          console.error(`[PaperUpload] Failed to cleanup Appwrite file:`, cleanupError.message);
        }
      }

      if (dbError.name === 'ValidationError') {
        const errors = Object.values(dbError.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + errors.join(', ')
        });
      }

      console.error(`[PaperUpload] Database error:`, dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to save paper record to database: ' + dbError.message
      });
    }

    // Success response
    return res.status(201).json({
      success: true,
      message: 'Paper uploaded successfully',
      data: {
        _id: paper._id,
        testSeriesId: paper.testSeriesId,
        fileName: paper.fileName,
        subject: paper.subject,
        paperType: paper.paperType,
        fileUrl: paper.publicFileUrl,
        uploadedAt: paper.createdAt,
        size: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
      }
    });

  } catch (error) {
    console.error(`[PaperUpload] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error during upload: ' + error.message
    });
  }
};

/**
 * @desc    Get papers by test series
 * @route   GET /api/testseries/:testSeriesId/papers
 * @access  Public (with access control check in service)
 */
export const getPapersByTestSeries = async (req, res) => {
  try {
    const { testSeriesId } = req.params;
    const { group, subject } = req.query;

    // Build query
    const query = { testSeriesId, isAvailable: true };
    if (group) query.group = group;
    if (subject) query.subject = subject;

    const papers = await TestSeriesPaper.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: papers.length,
      data: papers
    });
  } catch (error) {
    console.error('[GetPapers] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch papers: ' + error.message
    });
  }
};

/**
 * @desc    Get papers grouped by subject
 * @route   GET /api/testseries/:testSeriesId/papers/grouped
 * @access  Public
 */
export const getPapersGroupedBySubject = async (req, res) => {
  try {
    const { testSeriesId } = req.params;
    const { group, series } = req.query;

    const query = { testSeriesId, isAvailable: true };
    if (group) query.group = group;
    if (series) query.series = series;

    const papers = await TestSeriesPaper.find(query).sort({ subject: 1, paperType: 1 });

    // Group by subject
    const grouped = {};
    papers.forEach(paper => {
      if (!grouped[paper.subject]) {
        grouped[paper.subject] = {
          subject: paper.subject,
          papers: []
        };
      }
      grouped[paper.subject].papers.push(paper);
    });

    return res.status(200).json({
      success: true,
      data: Object.values(grouped)
    });
  } catch (error) {
    console.error('[GroupedPapers] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch papers: ' + error.message
    });
  }
};

/**
 * @desc    Get paper summary with counts
 * @route   GET /api/testseries/:testSeriesId/papers-summary
 * @access  Public
 */
export const getPapersSummary = async (req, res) => {
  try {
    const { testSeriesId } = req.params;

    const papers = await TestSeriesPaper.find({ testSeriesId, isAvailable: true });

    const summary = {
      total: papers.length,
      byGroup: {},
      bySubject: {},
      byPaperType: {}
    };

    papers.forEach(paper => {
      summary.byGroup[paper.group] = (summary.byGroup[paper.group] || 0) + 1;
      summary.bySubject[paper.subject] = (summary.bySubject[paper.subject] || 0) + 1;
      summary.byPaperType[paper.paperType] = (summary.byPaperType[paper.paperType] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[Summary] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch summary: ' + error.message
    });
  }
};

/**
 * @desc    Get my papers (subadmin only)
 * @route   GET /api/testseries/subadmin/my-papers
 * @access  Private/SubAdmin
 */
export const getMyPapers = async (req, res) => {
  try {
    const papers = await TestSeriesPaper.find({ createdBy: req.user._id })
      .populate('testSeriesId', 'title seriesType')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: papers.length,
      data: papers
    });
  } catch (error) {
    console.error('[MyPapers] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your papers: ' + error.message
    });
  }
};

/**
 * @desc    Update paper details
 * @route   PUT /api/testseries/papers/:paperId
 * @access  Private/SubAdmin
 */
export const updatePaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { group, subject, paperType, paperNumber, syllabusPercentage, isAvailable } = req.body;

    const paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Check authorization
    if (paper.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this paper'
      });
    }

    // Update fields
    if (group) paper.group = group;
    if (subject) paper.subject = subject;
    if (paperType) paper.paperType = paperType;
    if (paperNumber) paper.paperNumber = paperNumber;
    if (syllabusPercentage) paper.syllabusPercentage = syllabusPercentage;
    if (isAvailable !== undefined) paper.isAvailable = isAvailable;

    await paper.save();

    return res.status(200).json({
      success: true,
      message: 'Paper updated successfully',
      data: paper
    });
  } catch (error) {
    console.error('[UpdatePaper] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update paper: ' + error.message
    });
  }
};

/**
 * @desc    Delete paper
 * @route   DELETE /api/testseries/papers/:paperId
 * @access  Private/SubAdmin
 */
export const deletePaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Check authorization
    if (paper.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this paper'
      });
    }

    // Delete from Appwrite
    if (paper.appwriteFileId) {
      try {
        await deleteFileFromAppwrite(paper.appwriteFileId);
        console.log(`[DeletePaper] Deleted from Appwrite: ${paper.appwriteFileId}`);
      } catch (appwriteError) {
        console.warn(`[DeletePaper] Failed to delete from Appwrite: ${appwriteError.message}`);
        // Don't fail the entire operation if Appwrite delete fails
      }
    }

    // Delete from MongoDB
    await TestSeriesPaper.findByIdAndDelete(paperId);

    return res.status(200).json({
      success: true,
      message: 'Paper deleted successfully'
    });
  } catch (error) {
    console.error('[DeletePaper] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete paper: ' + error.message
    });
  }
};
