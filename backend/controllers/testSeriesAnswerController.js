import TestSeriesAnswer from '../models/TestSeriesAnswer.js';
import TestSeriesPaper from '../models/TestSeriesPaper.js';
import TestSeries from '../models/TestSeries.js';
import { uploadFileToAppwrite, deleteFileFromAppwrite } from '../utils/appwriteFileService.js';
import mongoose from 'mongoose';

// @desc    Upload answer sheet for a paper
// @route   POST /api/testseries/answers/upload
// @access  Private
export const uploadAnswerSheet = async (req, res) => {
  let uploadedFileId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a PDF file.'
      });
    }

    const { paperId, testSeriesId } = req.body;

    if (!paperId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID and Test Series ID are required'
      });
    }

    // Validate file is PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Check if paper exists
    const paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Resolve testSeriesId - handle shorthand (s1, s2, etc) or ObjectId
    let actualTestSeriesId = testSeriesId;
    let testSeries = null;
    
    console.log('[AnswerSheet] Input testSeriesId:', testSeriesId);
    
    // Check if it's a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      console.log('[AnswerSheet] testSeriesId is valid ObjectId, looking up...');
      testSeries = await TestSeries.findById(testSeriesId);
      if (testSeries) {
        actualTestSeriesId = testSeries._id.toString();
        console.log('[AnswerSheet] Found TestSeries by ObjectId:', actualTestSeriesId);
      } else {
        console.log('[AnswerSheet] ObjectId provided but not found in DB, using as-is');
        actualTestSeriesId = testSeriesId;
      }
    } else {
      // Try by seriesType (handle S1, S2, S3, S4 uppercase)
      const seriesType = testSeriesId.toUpperCase();
      console.log('[AnswerSheet] Not an ObjectId, trying to find by seriesType:', seriesType);
      testSeries = await TestSeries.findOne({ seriesType });
      if (testSeries) {
        actualTestSeriesId = testSeries._id.toString();
        console.log('[AnswerSheet] Found TestSeries by seriesType:', actualTestSeriesId);
      } else {
        // If shorthand format (s1, s2, etc), accept it for enrollment check
        const shorthandPattern = /^s[1-4]$/i;
        if (shorthandPattern.test(testSeriesId)) {
          console.log('[AnswerSheet] Valid shorthand format, accepting as-is:', testSeriesId);
          actualTestSeriesId = testSeriesId.toLowerCase();
        } else {
          console.error('[AnswerSheet] CRITICAL: Invalid testSeriesId format:', testSeriesId);
          return res.status(400).json({
            success: false,
            message: 'Invalid test series ID format. Use format like "s1", "s2", etc., or valid ObjectId.'
          });
        }
      }
    }
    
    console.log('[AnswerSheet] Using testSeriesId:', actualTestSeriesId);

    // Check if user is enrolled in the test series
    const Enrollment = (await import('../models/Enrollment.js')).default;
    
    // Check enrollment - try multiple formats
    let enrollment = null;
    
    // Try 1: Direct lookup with actualTestSeriesId (might be shorthand or ObjectId)
    if (mongoose.Types.ObjectId.isValid(actualTestSeriesId)) {
      enrollment = await Enrollment.findOne({
        userId: req.user._id,
        testSeriesId: actualTestSeriesId
      });
    }
    
    // Try 2: Look up TestSeries by seriesType and use its ObjectId
    if (!enrollment) {
      const ts = await TestSeries.findOne({ seriesType: actualTestSeriesId.toUpperCase() });
      if (ts) {
        enrollment = await Enrollment.findOne({
          userId: req.user._id,
          testSeriesId: ts._id
        });
        console.log('[AnswerSheet] Found enrollment via TestSeries lookup');
      }
    }
    
    // Try 3: If still not found, allow submission anyway (enrollment check is soft)
    if (!enrollment) {
      console.warn('[AnswerSheet] WARNING: No enrollment found for UserId:', req.user._id, 'TestSeriesId:', actualTestSeriesId);
      console.warn('[AnswerSheet] Allowing submission anyway - enrollment check is advisory');
    } else {
      console.log('[AnswerSheet] Enrollment verified');
    }

    // Check if submission deadline has passed
    if (paper.availabilityDate) {
      const lastSubmissionDate = new Date(paper.availabilityDate);
      // Add 1 day to availability date as last submission date (can be adjusted)
      lastSubmissionDate.setDate(lastSubmissionDate.getDate() + 1);
      if (new Date() > lastSubmissionDate) {
        return res.status(400).json({
          success: false,
          message: 'Submission deadline has passed'
        });
      }
    }

    // Upload file to Appwrite
    const appwriteResponse = await uploadFileToAppwrite(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    uploadedFileId = appwriteResponse.fileId;

    // Check if answer already exists
    let answer = await TestSeriesAnswer.findOne({
      paperId: paperId,
      userId: req.user._id
    });

    // Prepare testSeriesId for storage - MUST be ObjectId
    let storageTestSeriesId;
    
    if (mongoose.Types.ObjectId.isValid(actualTestSeriesId)) {
      // Already a valid ObjectId string, convert to ObjectId
      storageTestSeriesId = new mongoose.Types.ObjectId(actualTestSeriesId);
      console.log('[AnswerSheet] Using ObjectId directly:', storageTestSeriesId);
    } else {
      // Try to find TestSeries by seriesType first
      const ts = await TestSeries.findOne({ seriesType: actualTestSeriesId.toUpperCase() });
      if (ts) {
        storageTestSeriesId = ts._id;  // Already ObjectId from DB
        console.log('[AnswerSheet] Found TestSeries, using its ObjectId:', storageTestSeriesId);
      } else {
        // Create deterministic ObjectId from shorthand (s1 -> specific ObjectId)
        // This allows accepting shorthand even if TestSeries doesn't exist
        const shorthandPattern = /^s[1-4]$/i;
        if (shorthandPattern.test(actualTestSeriesId)) {
          // Create a deterministic ObjectId from shorthand
          // Using pattern: 000000000000000000000001 for s1, etc.
          const num = actualTestSeriesId.toLowerCase().charCodeAt(1) - 48; // s1 -> 1
          const hexString = '00000000000000000000000' + num;
          storageTestSeriesId = new mongoose.Types.ObjectId(hexString);
          console.log('[AnswerSheet] Generated ObjectId from shorthand', actualTestSeriesId + ':', storageTestSeriesId);
        } else {
          console.error('[AnswerSheet] CRITICAL: Cannot convert to ObjectId. Invalid format:', actualTestSeriesId);
          return res.status(400).json({
            success: false,
            message: 'Invalid test series ID format. Use s1, s2, s3, s4 or valid ObjectId.'
          });
        }
      }
    }

    if (answer) {
      // Update existing answer
      console.log('[AnswerSheet] Updating existing answer');
      if (answer.answerSheetFileId) {
        try {
          await deleteFileFromAppwrite(answer.answerSheetFileId);
        } catch (deleteError) {
          console.error('Error deleting old file:', deleteError);
        }
      }

      answer.testSeriesId = storageTestSeriesId;  // Use ObjectId directly
      answer.answerSheetFileId = appwriteResponse.fileId;
      answer.answerSheetAppwriteBucketId = appwriteResponse.bucketId;
      answer.answerSheetUrl = appwriteResponse.publicFileUrl;
      answer.answerSheetFileName = req.file.originalname;
      answer.submissionDate = new Date();
      answer.isSubmitted = true;
      answer.isEvaluated = false; // Reset evaluation status
      answer.marksObtained = 0;
      answer.evaluatorComments = '';
      answer.evaluatedAt = null;
      answer.evaluatedBy = null;

      await answer.save();
      console.log('[AnswerSheet] Updated existing answer successfully');
    } else {
      // Create new answer - IMPORTANT: Pass ObjectId directly, NOT string
      console.log('[AnswerSheet] Creating new answer with testSeriesId:', storageTestSeriesId);
      answer = await TestSeriesAnswer.create({
        testSeriesId: storageTestSeriesId,  // ObjectId, not string
        paperId: paperId,
        userId: req.user._id,
        answerSheetFileId: appwriteResponse.fileId,
        answerSheetAppwriteBucketId: appwriteResponse.bucketId,
        answerSheetUrl: appwriteResponse.publicFileUrl,
        answerSheetFileName: req.file.originalname,
        submissionDate: new Date(),
        isSubmitted: true,
        isEvaluated: false,
        marksObtained: 0,
        maxMarks: 100,
        percentage: 0
      });
      console.log('[AnswerSheet] Created new answer successfully:', answer._id);
    }

    res.status(201).json({
      success: true,
      answer,
      message: 'Answer sheet uploaded successfully'
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (uploadedFileId) {
      try {
        await deleteFileFromAppwrite(uploadedFileId);
      } catch (deleteError) {
        console.error('Cleanup failed:', deleteError);
      }
    }

    console.error('Upload answer sheet error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload answer sheet'
    });
  }
};

// @desc    Get user's answer sheets for a test series
// @route   GET /api/testseries/:testSeriesId/answers/my
// @access  Private
export const getMyAnswers = async (req, res) => {
  try {
    const { testSeriesId } = req.params;
    const { group, subject, series } = req.query;

    console.log('[GetMyAnswers] Input testSeriesId:', testSeriesId);

    // Resolve testSeriesId - handle shorthand (s1, s2, etc) or ObjectId
    let queryTestSeriesId;
    
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      // It's already a valid ObjectId
      queryTestSeriesId = testSeriesId;
      console.log('[GetMyAnswers] Using ObjectId directly:', queryTestSeriesId);
    } else {
      // Try to resolve shorthand to ObjectId
      const testSeries = await TestSeries.findOne({ seriesType: testSeriesId.toUpperCase() });
      if (testSeries) {
        queryTestSeriesId = testSeries._id.toString();
        console.log('[GetMyAnswers] Found TestSeries, using ObjectId:', queryTestSeriesId);
      } else {
        // Use deterministic ObjectId for shorthand
        const shorthandPattern = /^s[1-4]$/i;
        if (shorthandPattern.test(testSeriesId)) {
          const num = testSeriesId.toLowerCase().charCodeAt(1) - 48; // s1 -> 1
          const hexString = '00000000000000000000000' + num;
          queryTestSeriesId = new mongoose.Types.ObjectId(hexString).toString();
          console.log('[GetMyAnswers] Generated deterministic ObjectId from shorthand:', queryTestSeriesId);
        } else {
          console.error('[GetMyAnswers] Invalid testSeriesId format:', testSeriesId);
          return res.status(400).json({
            success: false,
            message: 'Invalid test series ID format'
          });
        }
      }
    }

    const query = {
      testSeriesId: queryTestSeriesId,
      userId: req.user._id
    };

    console.log('[GetMyAnswers] Query:', JSON.stringify(query));

    const answers = await TestSeriesAnswer.find(query)
      .populate({
        path: 'paperId',
        populate: {
          path: 'testSeriesId',
          select: 'title seriesType'
        }
      })
      .sort({ createdAt: -1 });

    console.log('[GetMyAnswers] Found answers:', answers.length);

    // Filter out answers where paperId is null or doesn't match filters
    const filteredAnswers = answers.filter(a => {
      if (!a.paperId) return false;
      if (group && a.paperId.group !== group) return false;
      if (subject && a.paperId.subject !== subject) return false;
      if (series && a.paperId.series !== series) return false;
      return true;
    });

    res.json({
      success: true,
      answers: filteredAnswers
    });
  } catch (error) {
    console.error('Get my answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all answer sheets for subadmin (Users Answersheets)
// @route   GET /api/testseries/answers/subadmin/all
// @access  Private/SubAdmin
export const getAllAnswerSheets = async (req, res) => {
  try {
    const { paperId, testSeriesId, status } = req.query;

    const query = {};
    if (paperId) query.paperId = paperId;
    if (testSeriesId) query.testSeriesId = testSeriesId;
    if (status === 'evaluated') query.isEvaluated = true;
    if (status === 'pending') query.isEvaluated = false;
    if (status === 'submitted') query.isSubmitted = true;

    const answers = await TestSeriesAnswer.find(query)
      .populate('userId', 'name email phone')
      .populate({
        path: 'paperId',
        populate: {
          path: 'testSeriesId',
          select: 'title seriesType'
        }
      })
      .populate('evaluatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      answers
    });
  } catch (error) {
    console.error('Get all answer sheets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload evaluated sheet for an answer
// @route   POST /api/testseries/answers/:answerId/evaluated
// @access  Private/SubAdmin
export const uploadEvaluatedSheet = async (req, res) => {
  let uploadedFileId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a PDF file.'
      });
    }

    const { answerId } = req.params;
    const { marksObtained, maxMarks, evaluatorComments } = req.body;

    // Validate file is PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    const answer = await TestSeriesAnswer.findById(answerId)
      .populate('paperId');

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Upload evaluated sheet to Appwrite
    const appwriteResponse = await uploadFileToAppwrite(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    uploadedFileId = appwriteResponse.fileId;

    // Update answer with evaluation data
    answer.marksObtained = parseFloat(marksObtained) || 0;
    answer.maxMarks = parseFloat(maxMarks) || 100;
    answer.percentage = (answer.marksObtained / answer.maxMarks) * 100;
    answer.evaluatorComments = evaluatorComments || '';
    answer.evaluatedAt = new Date();
    answer.evaluatedBy = req.user._id;
    answer.isEvaluated = true;

    // Store evaluated sheet info (reuse existing fields or add new ones)
    // For now, we'll store it in the same fields as answer sheet
    // You might want to add separate fields for evaluated sheet
    answer.answerSheetFileId = appwriteResponse.fileId; // Update with evaluated sheet
    answer.answerSheetAppwriteBucketId = appwriteResponse.bucketId;
    answer.answerSheetUrl = appwriteResponse.publicFileUrl;
    answer.answerSheetFileName = req.file.originalname;

    await answer.save();

    res.json({
      success: true,
      answer,
      message: 'Evaluated sheet uploaded successfully'
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (uploadedFileId) {
      try {
        await deleteFileFromAppwrite(uploadedFileId);
      } catch (deleteError) {
        console.error('Cleanup failed:', deleteError);
      }
    }

    console.error('Upload evaluated sheet error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload evaluated sheet'
    });
  }
};

// @desc    Get statistics for a paper (highest score, average score)
// @route   GET /api/testseries/papers/:paperId/statistics
// @access  Public
export const getPaperStatistics = async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Get all evaluated answers for this paper
    const answers = await TestSeriesAnswer.find({
      paperId: paperId,
      isEvaluated: true
    }).select('marksObtained maxMarks percentage');

    if (answers.length === 0) {
      return res.json({
        success: true,
        statistics: {
          totalSubmissions: 0,
          evaluatedSubmissions: 0,
          highestScore: 0,
          averageScore: 0,
          averagePercentage: 0
        }
      });
    }

    const marks = answers.map(a => a.marksObtained);
    const highestScore = Math.max(...marks);
    const averageScore = marks.reduce((sum, m) => sum + m, 0) / marks.length;
    const percentages = answers.map(a => a.percentage);
    const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    // Get total submissions (including non-evaluated)
    const totalSubmissions = await TestSeriesAnswer.countDocuments({
      paperId: paperId,
      isSubmitted: true
    });

    res.json({
      success: true,
      statistics: {
        totalSubmissions,
        evaluatedSubmissions: answers.length,
        highestScore,
        averageScore: Math.round(averageScore * 100) / 100,
        averagePercentage: Math.round(averagePercentage * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get paper statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's answer for a specific paper
// @route   GET /api/testseries/papers/:paperId/answers/my
// @access  Private
export const getMyAnswerForPaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const answer = await TestSeriesAnswer.findOne({
      paperId: paperId,
      userId: req.user._id
    })
      .populate('paperId')
      .populate('evaluatedBy', 'name');

    if (!answer) {
      return res.json({
        success: true,
        answer: null
      });
    }

    res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('Get my answer for paper error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

