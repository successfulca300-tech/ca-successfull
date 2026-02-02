import TestSeriesPaper from '../models/TestSeriesPaper.js';
import TestSeries from '../models/TestSeries.js';
import { validationResult } from 'express-validator';
import { uploadFileToAppwrite, deleteFileFromAppwrite } from '../utils/appwriteFileService.js';
import fs from 'fs';
import mongoose from 'mongoose';

// @desc    Upload test series paper with file to Appwrite
// @route   POST /api/testseries/:testSeriesId/papers
// @access  Private/SubAdmin
export const uploadPaper = async (req, res) => {
  let uploadedFileId = null;

  try {
    console.log('[Upload] Starting paper upload...');
    console.log('[Upload] User:', req.user ? { id: req.user._id, role: req.user.role } : 'NO USER');
    console.log('[Upload] req.file:', req.file ? 'yes' : 'no');
    console.log('[Upload] req.files:', req.files ? Object.keys(req.files) : 'no');
    console.log('[Upload] Body:', req.body);

    // Handle multer format (req.file) - primary for paper uploads
    let paperFile = null;
    let fileName = null;
    let fileBuffer = null;

    // Try multer format first (req.file) - this is the primary method for paper uploads
    if (req.file) {
      paperFile = req.file;
      fileName = paperFile.originalname || 'paper';
      fileBuffer = paperFile.buffer;
      console.log('[Upload] Using multer format. File:', { name: fileName, size: fileBuffer?.length });
    }
    // Fallback to express-fileupload format (req.files.paper) for other routes
    else if (req.files && req.files.paper) {
      paperFile = req.files.paper;
      if (Array.isArray(paperFile)) paperFile = paperFile[0];
      fileName = paperFile.name || paperFile.originalname || 'paper';

      console.log('[Upload] Using express-fileupload format. File:', { name: fileName, size: paperFile.size });

      // Try multiple strategies to get buffer from express-fileupload
      try {
        const tempPath = paperFile.tempFilePath || paperFile.tempPath || paperFile.path;
        if (tempPath && fs.existsSync(tempPath)) {
          fileBuffer = fs.readFileSync(tempPath);
          console.log('[Upload] Read buffer from tempPath, size:', fileBuffer.length);
        } else if (paperFile.data && Buffer.isBuffer(paperFile.data)) {
          fileBuffer = paperFile.data;
          console.log('[Upload] Using paperFile.data buffer, size:', fileBuffer.length);
        } else if (paperFile.buffer && Buffer.isBuffer(paperFile.buffer)) {
          fileBuffer = paperFile.buffer;
          console.log('[Upload] Using paperFile.buffer, size:', fileBuffer.length);
        } else if (typeof paperFile.mv === 'function') {
          // Try using mv() to save to temp file
          const tmpPath = `${require('os').tmpdir()}/paper_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          await new Promise((resolve, reject) =>
            paperFile.mv(tmpPath, (err) => err ? reject(err) : resolve())
          );
          if (fs.existsSync(tmpPath)) {
            fileBuffer = fs.readFileSync(tmpPath);
            try { fs.unlinkSync(tmpPath); } catch (e) {}
            console.log('[Upload] Moved via mv() and read buffer, size:', fileBuffer.length);
          }
        }
      } catch (bufferErr) {
        console.error('[Upload] Error getting buffer from express-fileupload:', bufferErr.message);
      }
    }

    // Verify file was uploaded
    if (!fileBuffer || !paperFile) {
      console.log('[Upload] ERROR: No file provided or could not read file buffer');
      return res.status(400).json({ success: false, message: 'No file provided. Please select a file.' });
    }

    // Check validation errors but don't reject on optional fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const criticalErrors = errors.array().filter(e => !['paperNumber', 'syllabusPercentage'].includes(e.param));
      if (criticalErrors.length > 0) {
        console.log('[Upload] Validation errors:', criticalErrors);
        return res.status(400).json({ success: false, errors: criticalErrors });
      }
    }

    // Set defaults for optional fields
    const {
      testSeriesId
    } = req.params;

    const {
      group = 'Group 1',
      subject = 'FR',
      paperType = 'question',
      paperNumber = '1',
      syllabusPercentage = '100%',
      series = null,
      availabilityDate = new Date(),
    } = req.body;

    console.log('[Upload] Processed fields:', { group, subject, paperType, paperNumber, syllabusPercentage, series });

    // Resolve testSeriesId - handle shorthand (s1, s2, etc) or ObjectId
    let actualTestSeriesId = testSeriesId;
    let testSeries = null;
    
    console.log('[Upload] testSeriesId from URL:', testSeriesId);
    
    // Check if it's a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      // Try to find by MongoDB ObjectId
      testSeries = await TestSeries.findById(testSeriesId);
      console.log('[Upload] Found by ObjectId:', !!testSeries);
      
      if (testSeries) {
        actualTestSeriesId = testSeries._id.toString();
        console.log('[Upload] Test series found:', testSeries.title, 'Type:', testSeries.seriesType);
      }
    }
    
    // If not found by ObjectId, try by seriesType (handle S1, S2, S3, S4 uppercase)
    if (!testSeries) {
      const seriesType = testSeriesId.toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
      console.log('[Upload] Found by seriesType:', !!testSeries, 'SearchType:', seriesType);
      
      if (testSeries) {
        actualTestSeriesId = testSeries._id.toString();
        console.log('[Upload] Test series found:', testSeries.title, 'Type:', testSeries.seriesType);
      }
    }
    
    // If still not found, accept shorthand format (s1, s2, etc) for frontend-generated IDs
    if (!testSeries) {
      console.log('[Upload] No TestSeries document found, using provided ID as shorthand:', testSeriesId);
      // Normalize shorthand to lowercase for consistency
      actualTestSeriesId = testSeriesId.toLowerCase();
    }

    // Check authorization - if testSeries exists, check ownership
    if (testSeries) {
      const isAuthorized = (testSeries.createdBy && testSeries.createdBy.toString() === req.user._id.toString()) || req.user.role === 'admin';
      if (!isAuthorized) {
        console.log('[Upload] ERROR: Not authorized. CreatedBy:', testSeries.createdBy, 'UserId:', req.user._id);
        return res.status(403).json({ success: false, message: 'Not authorized to upload papers for this test series' });
      }
    } else {
      // For shorthand format (s1, s2, etc.) without DB entry, allow SubAdmin and Admin to upload
      if (req.user.role !== 'admin' && req.user.role !== 'subadmin') {
        console.log('[Upload] ERROR: Only admin or subadmin can upload papers. User role:', req.user.role);
        return res.status(403).json({ success: false, message: 'Only admins and subadmins can upload papers for this test series' });
      }
      console.log('[Upload] Authorization OK - SubAdmin/Admin uploading for shorthand series:', actualTestSeriesId);
    }

    // Validate series for S1
    let seriesValue = series || null;
    if (testSeries && testSeries.seriesType === 'S1' && !seriesValue) {
      console.log('[Upload] ERROR: Series required for S1 but got:', seriesValue);
      return res.status(400).json({ success: false, message: 'Series is required for S1' });
    }
    if (testSeries && ['S2', 'S3', 'S4'].includes(testSeries.seriesType)) {
      seriesValue = null;
    }
    // For shorthand format, infer series type from testSeriesId
    if (!testSeries && actualTestSeriesId.toLowerCase().startsWith('s')) {
      const inferred = actualTestSeriesId.toUpperCase();
      if (['S2', 'S3', 'S4'].includes(inferred)) {
        seriesValue = null;
      }
    }

    // Upload file to Appwrite
    console.log(`[Upload] Uploading to Appwrite: ${fileName} (${fileBuffer.length} bytes)`);
    const appwriteResponse = await uploadFileToAppwrite(
      fileBuffer,
      fileName,
      paperFile.mimetype || 'application/octet-stream'
    );
    uploadedFileId = appwriteResponse.fileId;

    console.log('[Upload] File uploaded to Appwrite successfully. FileId:', appwriteResponse.fileId);

    // Create paper record in MongoDB
    const paper = await TestSeriesPaper.create({
      testSeriesId: actualTestSeriesId,
      group,
      subject,
      paperType,
      paperNumber: parseInt(paperNumber) || 1,
      syllabusPercentage,
      series: seriesValue,
      fileName: fileName,
      appwriteFileId: appwriteResponse.fileId,
      appwriteBucketId: appwriteResponse.bucketId,
      publicFileUrl: appwriteResponse.publicFileUrl,
      fileSizeBytes: fileBuffer.length,
      availabilityDate: availabilityDate || new Date(),
      isAvailable: true,
      publishStatus: 'published', // Subadmin uploads are auto-published by default
      isVisibleToUsers: true,
      createdBy: req.user._id,
    });

    console.log('[Upload] Paper saved to MongoDB successfully. ID:', paper._id);

    res.status(201).json({ 
      success: true, 
      paper,
      message: 'Paper uploaded successfully',
    });
  } catch (error) {
    // Cleanup uploaded file on error
    if (uploadedFileId) {
      try {
        console.log('[Upload] Cleaning up uploaded file:', uploadedFileId);
        await deleteFileFromAppwrite(uploadedFileId);
      } catch (deleteError) {
        console.error('[Upload] Cleanup failed:', deleteError.message);
      }
    }

    console.error('[Upload] ERROR:', error.message);
    console.error('[Upload] Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload paper',
      error: error.message 
    });
  }
};

// @desc    Get papers for a test series
// @route   GET /api/testseries/:testSeriesId/papers
// @access  Public
export const getPapersByTestSeries = async (req, res) => {
  try {
    let { testSeriesId } = req.params;
    const { group, subject, series, paperType } = req.query;

    // Resolve testSeriesId - handle shorthand (s1, s2, etc) or ObjectId
    let testSeries = null;
    
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      testSeries = await TestSeries.findById(testSeriesId);
    }
    
    if (!testSeries) {
      const seriesType = testSeriesId.toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
    }
    
    // Use ID as-is for query (both shorthand and ObjectId should work)
    let queryId = testSeries ? testSeries._id.toString() : testSeriesId;

    // Normalize shorthand to lowercase for consistency with upload
    if (!testSeries && testSeriesId) {
      queryId = testSeriesId.toLowerCase();
    }

    // Build candidate ids to match stored paper.testSeriesId values (ObjectId or shorthand)
    const candidatePaperIds = [queryId];
    if (!mongoose.Types.ObjectId.isValid(queryId)) {
      const tsDoc = await TestSeries.findOne({ seriesType: queryId.toUpperCase() });
      if (tsDoc) candidatePaperIds.push(tsDoc._id.toString());
    } else {
      const tsDoc = await TestSeries.findById(queryId);
      if (tsDoc && tsDoc.seriesType) candidatePaperIds.push(tsDoc.seriesType.toLowerCase());
    }

    const uniqueCandidatePaperIds = Array.from(new Set(candidatePaperIds));

    const query = { testSeriesId: { $in: uniqueCandidatePaperIds }, publishStatus: 'published', isVisibleToUsers: true };

    if (group) query.group = group;
    if (subject) query.subject = subject;
    if (series) query.series = series;
    if (paperType) query.paperType = paperType;

    // Check if test series is published - only if document exists in DB
    if (testSeries) {
      if (testSeries.publishStatus !== 'published' || !testSeries.isActive) {
        if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== testSeries.createdBy._id.toString())) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }
    // If no TestSeries in DB, papers are accessible if they exist (shorthand format)

    const papers = await TestSeriesPaper.find(query)
      .populate('createdBy', 'name')
      .sort({ paperNumber: 1, createdAt: 1 });

    res.json({ success: true, papers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get papers grouped by subject for user display
// @route   GET /api/testseries/:testSeriesId/papers/grouped
// @access  Protected
export const getPapersGroupedBySubject = async (req, res) => {
  try {
    let { testSeriesId } = req.params;
    const { group, series } = req.query;
    const userId = req.user._id;

    console.log('[Access Control] getPapersGroupedBySubject called with testSeriesId:', testSeriesId);

    // Normalize shorthand IDs to lowercase for consistency with paper storage
    let normalizedTestSeriesId = testSeriesId;
    if (testSeriesId && typeof testSeriesId === 'string' && !mongoose.Types.ObjectId.isValid(testSeriesId)) {
      // It's not an ObjectId, so it's likely shorthand - normalize to lowercase
      normalizedTestSeriesId = testSeriesId.toLowerCase();
      console.log('[Access Control] Normalized testSeriesId from', testSeriesId, 'to', normalizedTestSeriesId);
    }

    // CRITICAL ACCESS CONTROL: Check enrollment and get purchased subjects
    // Use normalized testSeriesId but also allow matching alternate representations (ObjectId vs shorthand)
    const Enrollment = (await import('../models/Enrollment.js')).default;

    // Build candidate ids to match enrollment entries reliably
    const candidateEnrollmentIds = [normalizedTestSeriesId];

    // If normalizedTestSeriesId is NOT an ObjectId, try to find a TestSeries doc with matching seriesType
    if (!mongoose.Types.ObjectId.isValid(normalizedTestSeriesId)) {
      const tsDoc = await TestSeries.findOne({ seriesType: normalizedTestSeriesId.toUpperCase() });
      if (tsDoc) candidateEnrollmentIds.push(tsDoc._id.toString());
    } else {
      // If it is an ObjectId, also try to add shorthand (s1, s2...) if seriesType exists
      const tsDoc = await TestSeries.findById(normalizedTestSeriesId);
      if (tsDoc && tsDoc.seriesType) candidateEnrollmentIds.push(tsDoc.seriesType.toLowerCase());
    }

    // Deduplicate
    const uniqueCandidateEnrollmentIds = Array.from(new Set(candidateEnrollmentIds));

    const enrollments = await Enrollment.find({
      userId: userId,
      testSeriesId: { $in: uniqueCandidateEnrollmentIds },
      paymentStatus: 'paid'
    });

    // If no paid enrollment, return empty papers
    if (!enrollments || enrollments.length === 0) {
      console.log(`[Access Control] No paid enrollment found for user ${userId} on series ${normalizedTestSeriesId} - checked IDs: ${uniqueCandidateEnrollmentIds}`);
      return res.json({ success: true, papers: {} });
    }

    // Merge all purchasedSubjects from all enrollments (user may have purchased subjects in multiple batches)
    const allSubjectsSet = new Set();
    enrollments.forEach(enrollment => {
      if (enrollment.purchasedSubjects && Array.isArray(enrollment.purchasedSubjects)) {
        enrollment.purchasedSubjects.forEach(subject => allSubjectsSet.add(subject));
      }
    });
    
    const purchasedSubjects = Array.from(allSubjectsSet);
    
    // Log for debugging
    console.log(`[Access Control] User ${userId} - Found ${enrollments.length} enrollments. Merged subjects:`, purchasedSubjects);

    // If no purchased subjects, return empty (prevent all subjects from showing)
    if (purchasedSubjects.length === 0) {
      console.log(`[Access Control] No purchased subjects found for user ${userId}`);
      return res.json({ success: true, papers: {} });
    }

    // Extract unique subjects from purchasedSubjects (handle both 'FR' and 'series1-FR' formats)
    const uniqueSubjects = new Set();
    purchasedSubjects.forEach(ps => {
      if (ps.includes('-')) {
        const parts = ps.split('-');
        uniqueSubjects.add(parts[parts.length - 1]); // Last part is subject
      } else {
        uniqueSubjects.add(ps);
      }
    });

    console.log(`[Access Control] Extracted unique subjects:`, Array.from(uniqueSubjects));

    // Query papers using the normalized testSeriesId format but also accept alternate representations
    // Build candidate paper IDs similar to enrollment check
    const candidatePaperIds = [normalizedTestSeriesId];
    if (!mongoose.Types.ObjectId.isValid(normalizedTestSeriesId)) {
      const tsDoc = await TestSeries.findOne({ seriesType: normalizedTestSeriesId.toUpperCase() });
      if (tsDoc) candidatePaperIds.push(tsDoc._id.toString());
    } else {
      const tsDoc = await TestSeries.findById(normalizedTestSeriesId);
      if (tsDoc && tsDoc.seriesType) candidatePaperIds.push(tsDoc.seriesType.toLowerCase());
    }

    const uniqueCandidatePaperIds = Array.from(new Set(candidatePaperIds));

    const query = { testSeriesId: { $in: uniqueCandidatePaperIds }, isAvailable: true, publishStatus: 'published', isVisibleToUsers: true, subject: { $in: Array.from(uniqueSubjects) } };

    if (group) query.group = group;
    if (series) query.series = series;

    console.log('[Access Control] Querying papers with:', query);

    // Use the set of candidate testSeriesIds for paper lookup
    const papers = await TestSeriesPaper.find(query)
      .populate('createdBy', 'name')
      .sort({ subject: 1, paperType: 1, paperNumber: 1, createdAt: 1 });

    console.log(`[Access Control] Found ${papers.length} papers for user ${userId}`);

    // Group papers by subject
    const groupedPapers = {};
    papers.forEach(paper => {
      if (!groupedPapers[paper.subject]) {
        groupedPapers[paper.subject] = [];
      }
      groupedPapers[paper.subject].push(paper);
    });

    res.json({ success: true, papers: groupedPapers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all papers for subadmin
// @route   GET /api/testseries/subadmin/papers
// @access  Private/SubAdmin
export const getMyPapers = async (req, res) => {
  try {
    // Get all test series created by this user
    const testSeriesIds = await TestSeries.find({ createdBy: req.user._id }).select('_id');
    const ids = testSeriesIds.map(ts => ts._id);

    const papers = await TestSeriesPaper.find({ testSeriesId: { $in: ids } })
      .populate('testSeriesId', 'title seriesType')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, papers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update paper details
// @route   PUT /api/testseries/papers/:paperId
// @access  Private/SubAdmin
export const updatePaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const {
      group,
      subject,
      paperType,
      paperNumber,
      syllabusPercentage,
      fileName,
      availabilityDate,
      isAvailable,
      isEvaluated,
    } = req.body;

    let paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    // Verify authorization - handle both ObjectId and shorthand testSeriesId
    let testSeries = null;
    const testSeriesId = paper.testSeriesId;
    
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      testSeries = await TestSeries.findById(testSeriesId);
    }
    
    if (!testSeries) {
      const seriesType = String(testSeriesId).toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
    }
    
    // If testSeries exists in DB, check authorization
    if (testSeries) {
      if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else {
      // For shorthand format (s1, s2, etc.) without DB entry, allow SubAdmin and Admin
      if (req.user.role !== 'admin' && req.user.role !== 'subadmin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    if (group !== undefined) paper.group = group;
    if (subject !== undefined) paper.subject = subject;
    if (paperType !== undefined) paper.paperType = paperType;
    if (paperNumber !== undefined) paper.paperNumber = paperNumber;
    if (syllabusPercentage !== undefined) paper.syllabusPercentage = syllabusPercentage;
    if (fileName !== undefined) paper.fileName = fileName;
    if (availabilityDate !== undefined) paper.availabilityDate = availabilityDate;
    if (isAvailable !== undefined) paper.isAvailable = isAvailable;
    if (isEvaluated !== undefined) paper.isEvaluated = isEvaluated;

    const updatedPaper = await paper.save();
    res.json({ success: true, paper: updatedPaper });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete paper
// @route   DELETE /api/testseries/papers/:paperId
// @access  Private/SubAdmin
export const deletePaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await TestSeriesPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    // Verify authorization - handle both ObjectId and shorthand testSeriesId
    let testSeries = null;
    const testSeriesId = paper.testSeriesId;
    
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      testSeries = await TestSeries.findById(testSeriesId);
    }
    
    if (!testSeries) {
      const seriesType = String(testSeriesId).toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
    }
    
    // If testSeries exists in DB, check authorization
    if (testSeries) {
      if (testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else {
      // For shorthand format (s1, s2, etc.) without DB entry, allow SubAdmin and Admin
      if (req.user.role !== 'admin' && req.user.role !== 'subadmin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    // Delete the paper file from Appwrite if it exists
    if (paper.appwriteFileId) {
      try {
        await deleteFileFromAppwrite(paper.appwriteFileId);
      } catch (deleteError) {
        console.error('Error deleting file from Appwrite:', deleteError);
        // Continue with paper deletion even if file deletion fails
      }
    }

    await paper.deleteOne();
    res.json({ success: true, message: 'Paper deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get papers count by series and subject
// @route   GET /api/testseries/:testSeriesId/papers-summary
// @access  Public
export const getPapersSummary = async (req, res) => {
  try {
    let { testSeriesId } = req.params;

    // Resolve testSeriesId - handle shorthand (s1, s2, etc) or ObjectId
    let testSeries = null;
    
    if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
      testSeries = await TestSeries.findById(testSeriesId);
    }
    
    if (!testSeries) {
      const seriesType = testSeriesId.toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
    }
    
    // Use ID as-is for query
    let queryId = testSeries ? testSeries._id.toString() : testSeriesId;
    // Normalize shorthand to lowercase for consistency with upload
    if (!testSeries && testSeriesId) {
      queryId = testSeriesId.toLowerCase();
    }
    
    // Check if test series exists - if we found it, continue
    if (!testSeries) {
      // Allow papers to be stored/retrieved with shorthand format even if TestSeries not in DB
      console.log('[PapersSummary] No TestSeries document found, using provided ID:', testSeriesId);
    }

    // Get count of papers by group and subject
    const papers = await TestSeriesPaper.find({ testSeriesId: queryId });
    
    const summary = {
      total: papers.length,
      byGroup: {},
      bySubject: {},
      byPaperType: {},
      papersByGroupSubject: {},
    };

    papers.forEach(paper => {
      // By group
      summary.byGroup[paper.group] = (summary.byGroup[paper.group] || 0) + 1;
      
      // By subject
      summary.bySubject[paper.subject] = (summary.bySubject[paper.subject] || 0) + 1;
      
      // By paper type
      summary.byPaperType[paper.paperType] = (summary.byPaperType[paper.paperType] || 0) + 1;
      
      // Papers by group and subject
      const key = `${paper.group}-${paper.subject}`;
      summary.papersByGroupSubject[key] = (summary.papersByGroupSubject[key] || 0) + 1;
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
