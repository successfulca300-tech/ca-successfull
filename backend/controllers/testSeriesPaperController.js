import TestSeriesPaper from '../models/TestSeriesPaper.js';
import TestSeries from '../models/TestSeries.js';
import { validationResult } from 'express-validator';
import { uploadFileToAppwrite, deleteFileFromAppwrite } from '../utils/appwriteFileService.js';
import fs from 'fs';
import mongoose from 'mongoose';
import { isTestSeriesEnrollmentActive } from '../utils/testSeriesAttempt.js';

const normalizeSyllabusPercentageForSeries = (seriesType, providedValue) => {
  const current = ['100%', '50%', '30%'].includes(String(providedValue)) ? String(providedValue) : '100%';
  if (seriesType === 'S1') return '100%';
  if (seriesType === 'S2') return '50%';
  if (seriesType === 'S3') return '30%';
  return current; // Keep as-is for S4 or unknown
};

const normalizePaperForSeries = (paper, seriesType) => {
  const normalized = normalizeSyllabusPercentageForSeries(seriesType, paper?.syllabusPercentage);
  if (paper && typeof paper.toObject === 'function') {
    return { ...paper.toObject(), syllabusPercentage: normalized };
  }
  return { ...paper, syllabusPercentage: normalized };
};

const getSeriesTypeLabel = (seriesType, examLevel = 'final') => {
  if (seriesType === 'S1') return 'Full Syllabus';
  if (seriesType === 'S2') return '50% Syllabus';
  if (seriesType === 'S3') return examLevel === 'inter' ? 'Chapterwise' : '30% Syllabus';
  return 'CA Successful Specials';
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseFixedSeriesIdentifier = (value) => {
  const raw = String(value || '').trim();
  const lower = raw.toLowerCase();
  if (!lower) {
    return { raw, lower, seriesType: null, examLevel: 'final', fixedKey: null };
  }

  const parts = lower.split('-').filter(Boolean);
  const seriesToken = parts.length > 0 ? parts[parts.length - 1] : lower;
  const seriesType = ['s1', 's2', 's3', 's4'].includes(seriesToken) ? seriesToken.toUpperCase() : null;
  const examLevel = lower.startsWith('inter-') ? 'inter' : 'final';
  const fixedKey = seriesType ? lower : null;

  return { raw, lower, seriesType, examLevel, fixedKey };
};

const findFixedSeriesDocument = async (identifier) => {
  const parsed = parseFixedSeriesIdentifier(identifier);
  let testSeries = null;

  if (parsed.fixedKey) {
    testSeries = await TestSeries.findOne({
      fixedKey: { $regex: `^${escapeRegex(parsed.fixedKey)}$`, $options: 'i' },
    });
  }

  if (!testSeries && parsed.seriesType) {
    testSeries = await TestSeries.findOne({
      seriesType: parsed.seriesType,
      examLevel: parsed.examLevel,
    });
  }

  // Fallback for legacy rows where examLevel may be missing/incorrect.
  if (!testSeries && parsed.seriesType) {
    testSeries = await TestSeries.findOne({ seriesType: parsed.seriesType });
  }

  return { parsed, testSeries };
};

const resolveSeriesForPaperRequest = async (testSeriesId, options = {}) => {
  const { createIfMissing = false, creatorId = null } = options;

  if (mongoose.Types.ObjectId.isValid(testSeriesId)) {
    const byId = await TestSeries.findById(testSeriesId);
    if (byId) {
      return {
        testSeries: byId,
        resolvedTestSeriesId: byId._id.toString(),
        parsed: parseFixedSeriesIdentifier(byId.fixedKey || testSeriesId),
      };
    }
  }

  const { parsed, testSeries: existing } = await findFixedSeriesDocument(testSeriesId);
  let testSeries = existing;

  if (!testSeries && createIfMissing && parsed.seriesType) {
    if (!creatorId) {
      throw new Error('creatorId is required when createIfMissing is true');
    }

    testSeries = await TestSeries.create({
      fixedKey: parsed.fixedKey || undefined,
      title: `${parsed.examLevel === 'inter' ? 'CA Inter' : 'CA Final'} Test Series ${parsed.seriesType}`,
      seriesType: parsed.seriesType,
      seriesTypeLabel: getSeriesTypeLabel(parsed.seriesType, parsed.examLevel),
      examLevel: parsed.examLevel,
      category: null,
      createdBy: creatorId,
      publishStatus: 'published',
      isActive: true,
    });
  }

  return {
    testSeries,
    resolvedTestSeriesId: testSeries ? testSeries._id.toString() : null,
    parsed,
  };
};

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

    const { testSeries, resolvedTestSeriesId } = await resolveSeriesForPaperRequest(testSeriesId, {
      createIfMissing: true,
      creatorId: req.user?._id,
    });

    if (!resolvedTestSeriesId) {
      return res.status(400).json({ success: false, message: 'Invalid testSeriesId' });
    }

    // Authorization: if testSeries exists and has a creator, allow only creator or admin to upload; otherwise allow subadmin/admin
    if (testSeries && testSeries.createdBy && testSeries.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to upload papers for this test series' });
    }

    // Validate series for S1
    let seriesValue = series || null;
    if (testSeries && testSeries.seriesType === 'S1' && !seriesValue) {
      return res.status(400).json({ success: false, message: 'Series is required for S1' });
    }
    if (testSeries && ['S2', 'S3', 'S4'].includes(testSeries.seriesType)) {
      seriesValue = null;
    }

    const normalizedSyllabusPercentage = normalizeSyllabusPercentageForSeries(testSeries?.seriesType, syllabusPercentage);

    // Upload file to Appwrite
    console.log(`[Upload] Uploading to Appwrite: ${fileName} (${fileBuffer.length} bytes)`);
    const appwriteResponse = await uploadFileToAppwrite(
      fileBuffer,
      fileName,
      paperFile.mimetype || 'application/octet-stream'
    );
    uploadedFileId = appwriteResponse.fileId;

    console.log('[Upload] File uploaded to Appwrite successfully. FileId:', appwriteResponse.fileId);

    // Create paper record in MongoDB (status set to 'published' for subadmin uploads)
    const paper = await TestSeriesPaper.create({
      testSeriesId: resolvedTestSeriesId,
      group,
      subject,
      paperType,
      paperNumber: parseInt(paperNumber) || 1,
      syllabusPercentage: normalizedSyllabusPercentage,
      series: seriesValue,
      fileName: fileName,
      appwriteFileId: appwriteResponse.fileId,
      appwriteBucketId: appwriteResponse.bucketId,
      publicFileUrl: appwriteResponse.publicFileUrl,
      fileSizeBytes: fileBuffer.length,
      availabilityDate: availabilityDate || new Date(),
      isAvailable: true,
      status: 'published',
      uploadedByRole: req.user.role || 'subadmin',
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

    const { testSeries, resolvedTestSeriesId } = await resolveSeriesForPaperRequest(testSeriesId);

    if (!resolvedTestSeriesId) {
      return res.status(404).json({ success: false, message: 'Test series not found' });
    }

    const query = { testSeriesId: resolvedTestSeriesId, status: 'published' };

    if (group) query.group = group;
    if (subject) query.subject = subject;
    if (series) query.series = series;
    if (paperType) query.paperType = paperType;
    // If no TestSeries in DB, papers are accessible if they exist (shorthand format)

    const papers = await TestSeriesPaper.find(query)
      .populate('createdBy', 'name')
      .sort({ paperNumber: 1, createdAt: 1 });

    const normalizedPapers = papers.map((paper) => normalizePaperForSeries(paper, testSeries?.seriesType));
    res.json({ success: true, papers: normalizedPapers });
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

    const { testSeries: resolvedTestSeries, parsed } = await resolveSeriesForPaperRequest(testSeriesId);

    if (!resolvedTestSeries) {
      console.log('[Access Control] No DB TestSeries found for', testSeriesId);
      return res.json({ success: true, papers: {} });
    }

    // CRITICAL ACCESS CONTROL: Check enrollment and get purchased subjects
    const Enrollment = (await import('../models/Enrollment.js')).default;
    const isInterScoped = (parsed?.fixedKey || '').startsWith('inter-');
    const enrollmentCandidates = Array.from(new Set([
      resolvedTestSeries?._id ? String(resolvedTestSeries._id) : null,
      parsed?.fixedKey || null,
      parsed?.seriesType && !isInterScoped ? parsed.seriesType.toLowerCase() : null,
      parsed?.seriesType && !isInterScoped ? parsed.seriesType : null,
    ].filter(Boolean)));

    const enrollmentQuery = {
      userId,
      paymentStatus: 'paid',
    };
    if (enrollmentCandidates.length > 1) {
      enrollmentQuery.$or = enrollmentCandidates.map((candidate) => ({
        testSeriesId: mongoose.Types.ObjectId.isValid(candidate)
          ? new mongoose.Types.ObjectId(candidate)
          : candidate,
      }));
    } else if (enrollmentCandidates.length === 1) {
      enrollmentQuery.testSeriesId = mongoose.Types.ObjectId.isValid(enrollmentCandidates[0])
        ? new mongoose.Types.ObjectId(enrollmentCandidates[0])
        : enrollmentCandidates[0];
    } else {
      enrollmentQuery.testSeriesId = resolvedTestSeries._id;
    }

    const enrollments = await Enrollment.find(enrollmentQuery);
    const activeEnrollments = enrollments.filter((enrollment) => isTestSeriesEnrollmentActive(enrollment));

    // If no paid enrollment, return empty papers
    if (!activeEnrollments || activeEnrollments.length === 0) {
      console.log(`[Access Control] No paid enrollment found for user ${userId} on series ${resolvedTestSeries._id}`);
      return res.json({ success: true, papers: {} });
    }

    // Merge all purchasedSubjects from all enrollments (user may have purchased subjects in multiple batches)
    const allSubjectsSet = new Set();
    activeEnrollments.forEach(enrollment => {
      if (enrollment.purchasedSubjects && Array.isArray(enrollment.purchasedSubjects)) {
        enrollment.purchasedSubjects.forEach(subject => allSubjectsSet.add(subject));
      }
    });
    
    const purchasedSubjects = Array.from(allSubjectsSet);
    
    // Log for debugging
    console.log(`[Access Control] User ${userId} - Found ${activeEnrollments.length} active enrollments. Merged subjects:`, purchasedSubjects);

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

    // Query papers using the resolved TestSeries ObjectId; only published content
    const query = { testSeriesId: resolvedTestSeries._id, status: 'published', subject: { $in: Array.from(uniqueSubjects) } };

    if (group) query.group = group;
    if (series) query.series = series;

    console.log('[Access Control] Querying papers with:', query);

    const papers = await TestSeriesPaper.find(query)
      .populate('createdBy', 'name')
      .sort({ subject: 1, paperType: 1, paperNumber: 1, createdAt: 1 });

    console.log(`[Access Control] Found ${papers.length} papers for user ${userId}`);

    const normalizedPapers = papers.map((paper) => normalizePaperForSeries(paper, resolvedTestSeries?.seriesType));

    // Group papers by subject
    const groupedPapers = {};
    normalizedPapers.forEach(paper => {
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

    const normalizedPapers = papers.map((paper) => normalizePaperForSeries(paper, paper?.testSeriesId?.seriesType));
    res.json({ success: true, papers: normalizedPapers });
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
    if (syllabusPercentage !== undefined) {
      paper.syllabusPercentage = normalizeSyllabusPercentageForSeries(testSeries?.seriesType, syllabusPercentage);
    } else if (testSeries?.seriesType === 'S1' || testSeries?.seriesType === 'S2' || testSeries?.seriesType === 'S3') {
      // Keep legacy data clean if old rows had wrong percentage values
      paper.syllabusPercentage = normalizeSyllabusPercentageForSeries(testSeries?.seriesType, paper.syllabusPercentage);
    }
    if (fileName !== undefined) paper.fileName = fileName;
    if (availabilityDate !== undefined) paper.availabilityDate = availabilityDate;
    if (isAvailable !== undefined) paper.isAvailable = isAvailable;
    if (isEvaluated !== undefined) paper.isEvaluated = isEvaluated;

    const updatedPaper = await paper.save();
    res.json({ success: true, paper: normalizePaperForSeries(updatedPaper, testSeries?.seriesType) });
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
    const { testSeries } = await resolveSeriesForPaperRequest(testSeriesId);

    if (!testSeries) {
      return res.json({
        success: true,
        summary: {
          total: 0,
          byGroup: {},
          bySubject: {},
          byPaperType: {},
          papersByGroupSubject: {},
        },
      });
    }

    // Get count of papers by group and subject
    const papers = await TestSeriesPaper.find({ testSeriesId: testSeries._id });
    
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
