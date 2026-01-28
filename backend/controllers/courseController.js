import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import fs from 'fs';
import { Client, Storage, InputFile } from 'node-appwrite';

// Helper function to sanitize fileId to meet Appwrite UID requirements
// Max 36 chars, a-z, A-Z, 0-9, underscore, no leading underscore
function sanitizeFileId(filename) {
  if (!filename) return `file_${Date.now()}`;
  // Remove extension, replace non-alphanumeric with underscore, limit to 36 chars
  let base = filename.replace(/\.[^/.]+$/, ''); // remove extension
  base = base.replace(/[^a-zA-Z0-9_]/g, '_'); // replace invalid chars with _
  base = base.replace(/^_+/, ''); // remove leading underscores
  if (base.length > 36) base = base.substring(0, 36);
  if (!base) base = `file_${Date.now()}`;
  return base;
}

// @desc    Get all published courses (public view)
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category, search } = req.query;

    const query = { isActive: true, publishStatus: 'published' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const courses = await Course.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req, res) => {
  try {
    // If route is public but client provided an Authorization header, try to populate req.user (best-effort)
    if (!req.user && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const possibleUser = await User.findById(decoded.id).select('-password');
        if (possibleUser) {
          req.user = possibleUser;
        }
      } catch (e) {
        // ignore token errors for public route
      }
    }

    const course = await Course.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .populate('reviews.userId', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If course is unpublished or inactive only allow owner/admin/subadmin
    if (!course.isActive || course.publishStatus !== 'published') {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'subadmin' && req.user._id.toString() !== course.createdBy._id.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // If course has a price > 0, ensure the user has an enrollment (paid) to access full content
    let hasAccess = false;
    if (course.price && Number(course.price) > 0) {
      if (req.user) {
        // Consider any enrollment record (paid or pending) as access for now so users who enrolled can view content.
        const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: course._id });
        if (enrollment) hasAccess = true;
      }
      // Owner and admin always have access
      if (req.user && (req.user.role === 'admin' || req.user._id.toString() === course.createdBy._id.toString())) hasAccess = true;
    } else {
      // Free course -> public
      hasAccess = true;
    }
      // Allow admin and subadmin roles to access course chapters/items
      if (req.user && (req.user.role === 'admin' || req.user.role === 'subadmin')) hasAccess = true;

      // Debug log for access decision — useful when troubleshooting subadmin visibility
      try {
        console.log('getCourseById debug', {
          courseId: req.params.id,
          requester: req.user ? String(req.user._id || req.user.id) : null,
          role: req.user ? req.user.role : null,
          hasAccess,
          chaptersCount: Array.isArray(course.chapters) ? course.chapters.length : 0,
        });
      } catch (e) { /* ignore logging errors */ }

    const safeCourse = course.toObject();
    // If user lacks access, strip sensitive fields (content/videoUrl/resources)
    if (!hasAccess) {
      delete safeCourse.content;
      delete safeCourse.videoUrl;
      delete safeCourse.resources;
      delete safeCourse.chapters;
      safeCourse.hasAccess = false;
    } else {
      safeCourse.hasAccess = true;
    }

    res.json(safeCourse);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create course (subadmin/admin only)
// @route   POST /api/courses
// @access  Private
export const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, instructor, thumbnail, price, duration, level, content, videoUrl, resources } = req.body;

    const course = await Course.create({
      title,
      description,
      category,
      instructor,
      thumbnail,
      price,
      duration,
      level: level || 'beginner',
      content,
      videoUrl,
      resources: resources || [],
      createdBy: req.user._id,
      publishStatus: 'draft',
    });

    const populatedCourse = await Course.findById(course._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.status(201).json(populatedCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update course (creator or admin)
// @route   PUT /api/courses/:id
// @access  Private
export const updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check authorization
    if (course.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, instructor, thumbnail, price, duration, level, content, videoUrl, resources } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (instructor) course.instructor = instructor;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (price !== undefined) course.price = price;
    if (duration) course.duration = duration;
    if (level) course.level = level;
    if (content) course.content = content;
    if (videoUrl !== undefined) course.videoUrl = videoUrl;
    if (resources) course.resources = resources;

    const updatedCourse = await course.save();
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.json(populatedCourse);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete course (creator or admin)
// @route   DELETE /api/courses/:id
// @access  Private
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await course.deleteOne();
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Publish course (admin approval)
// @route   PUT /api/courses/:id/publish
// @access  Private/Admin
export const publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { action, notes } = req.body; // action: 'approve', 'reject'

    if (action === 'approve') {
      course.publishStatus = 'published';
      course.isPublished = true;
      course.publishNotes = notes || '';
    } else if (action === 'reject') {
      course.publishStatus = 'rejected';
      course.publishNotes = notes || 'Rejected by admin';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const updatedCourse = await course.save();
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('category', 'name')
      .populate('createdBy', 'name');

    res.json(populatedCourse);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get courses by category
// @route   GET /api/courses/category/:categoryId
// @access  Public
export const getCoursesByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { category: req.params.categoryId, isActive: true, publishStatus: 'published' };

    const courses = await Course.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add review to course
// @route   POST /api/courses/:id/reviews
// @access  Private
export const addCourseReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: req.params.id });
    if (!enrollment) {
      return res.status(403).json({ message: 'Only enrolled users can review' });
    }

    const review = {
      userId: req.user._id,
      rating,
      comment,
    };

    course.reviews.push(review);

    // Recalculate average rating
    const avgRating = course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length;
    course.rating = parseFloat(avgRating.toFixed(2));

    const updatedCourse = await course.save();
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('reviews.userId', 'name');

    res.status(201).json(populatedCourse);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add chapter to a course (subadmin/admin)
// @route   POST /api/courses/:id/chapters
// @access  Private (subadmin/admin)
export const addChapter = async (req, res) => {
  try {
    const { title, description, order } = req.body;

    if (!title) return res.status(400).json({ message: 'Chapter title is required' });

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = {
      title,
      description: description || '',
      order: order || 0,
      items: [],
    };

    course.chapters = course.chapters || [];
    course.chapters.push(chapter);

    await course.save();

    // return the newly added chapter (last)
    const added = course.chapters[course.chapters.length - 1];
    res.status(201).json(added);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course not found' });
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item (video/resource) to a chapter
// @route   POST /api/courses/:id/chapters/:chapterId/items
// @access  Private (subadmin/admin)
export const addChapterItem = async (req, res) => {
  try {
    const { title, type, url, description, duration, order } = req.body;

    if (!title) return res.status(400).json({ message: 'Item title is required' });



    // Validate file for document types - must be proper URL, not file name
    if (url && (type === 'pdf' || type === 'document')) {
      // Check if it's a file name (contains extension and no http/https)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({
          message: 'For PDF/document types, file must be a valid HTTP/HTTPS link or Appwrite URL, not a file name'
        });
      }
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = (course.chapters || []).id(req.params.chapterId) || null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const item = {
      title,
      type: type || 'video',
      url: url || '',
      description: description || '',
      duration: duration || '',
      order: order || 0,
    };

    chapter.items = chapter.items || [];
    chapter.items.push(item);

    await course.save();

    const added = chapter.items[chapter.items.length - 1];
    res.status(201).json(added);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course or chapter not found' });
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload a file to Appwrite and attach as chapter item
// @route   POST /api/courses/:id/chapters/:chapterId/items/upload
// @access  Private (subadmin/admin)
export const uploadChapterItem = async (req, res) => {
  try {
    // Debugging: log headers and file containers
    console.log('uploadChapterItem called', {
      headers: Object.keys(req.headers).reduce((acc, k) => ({ ...acc, [k]: req.headers[k] }), {}),
      hasReqFile: !!req.file,
      hasReqFiles: !!req.files,
      bodyKeys: Object.keys(req.body || {}),
      reqBody: req.body,
    });

    // Support both multer (req.file) and express-fileupload (req.files.file)
    let uploadedFile = req.file || (req.files && (req.files.file || req.files.file0 || Object.values(req.files)[0]));
    if (!uploadedFile) {
      console.warn('No file found in request. req.file and req.files are empty');
      return res.status(400).json({ message: 'No file provided' });
    }

    // Normalize to multer-style fields when possible
    const originalname = uploadedFile.originalname || uploadedFile.name || uploadedFile.filename;
    const tempPath = uploadedFile.path || uploadedFile.tempFilePath || uploadedFile.tmpName || null;

    // Support Buffer uploads (express-fileupload) where file data is in uploadedFile.data
    const hasBufferData = !!uploadedFile.data;
    if (!tempPath && !hasBufferData) {
      console.warn('Uploaded file has no temp path and no buffer data', { uploadedFile });
      return res.status(400).json({ message: 'Uploaded file not available on server' });
    }
    // Handle both multer and express-fileupload body parsing
    let { title, type: requestType, description, duration, order } = req.body;

    // If using express-fileupload, fields might be in req.body as strings
    if (typeof title === 'string') {
      title = title;
    }

    // Determine file type from extension if not provided
    let type = requestType;
    if (!type) {
      const extension = originalname.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        type = 'pdf';
      } else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension)) {
        type = 'video';
      } else {
        type = 'document'; // fallback for other file types
      }
    }

    // Validate that subadmins can only upload video or pdf types
    if (req.user && req.user.role === 'subadmin' && type && !['video', 'pdf'].includes(type)) {
      return res.status(403).json({ message: 'Subadmins can only upload video or PDF files' });
    }

    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
      // cleanup
      try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
      return res.status(500).json({ message: 'Appwrite configuration missing' });
    }

    const client = new Client();
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
    const storage = new Storage(client);

    // create buffer (from temp path or from buffer) and upload using InputFile
    let fileBuffer = null;
    const tempPathCandidate = tempPath;
    try {
      if (tempPathCandidate && fs.existsSync(tempPathCandidate)) {
        fileBuffer = fs.readFileSync(tempPathCandidate);
      } else if (hasBufferData && Buffer.isBuffer(uploadedFile.data)) {
        fileBuffer = uploadedFile.data;
      } else if (uploadedFile.buffer && Buffer.isBuffer(uploadedFile.buffer)) {
        fileBuffer = uploadedFile.buffer;
      }
    } catch (readErr) {
      console.error('Failed to read uploaded file for Appwrite upload', readErr);
      if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
      return res.status(500).json({ message: 'Failed to read uploaded file' });
    }

    if (!fileBuffer) {
      console.error('No file buffer available for upload', { tempPathCandidate, hasBufferData });
      if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
      return res.status(400).json({ message: 'Uploaded file not available' });
    }

    const fileId = sanitizeFileId(originalname);
    let response;
    try {
      const inputFile = InputFile.fromBuffer(fileBuffer, originalname);
      response = await storage.createFile(APPWRITE_BUCKET_ID, fileId, inputFile);
      console.log('Appwrite upload response', { id: response.$id });
    } catch (e) {
      console.error('Appwrite upload error', e);
      if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
      throw e;
    }

    // remove temp file if present
    try { if (tempPathCandidate && fs.existsSync(tempPathCandidate)) fs.unlinkSync(tempPathCandidate); } catch (e) {}

    // Build file URL for reference (optional)
    const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
    const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
    const fileUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    // Attach to course chapter
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = (course.chapters || []).id(req.params.chapterId) || null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    // Generate a user-friendly title if not provided
    let itemTitle = title;
    if (!itemTitle || itemTitle.trim() === '') {
      // Use a default title instead of file name
      itemTitle = 'Untitled Item';
    }

    const item = {
      title: itemTitle,
      type: type || 'video',
      // store the full view URL so frontend can render directly
      url: fileUrl,
      description: description || '',
      duration: duration || '',
      order: order || 0,
    };

    chapter.items = chapter.items || [];
    chapter.items.push(item);

    await course.save();

    const added = chapter.items[chapter.items.length - 1];
    return res.status(201).json({ item: added, file: response, url: fileUrl });
  } catch (error) {
    console.error('uploadChapterItem error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update chapter (subadmin/admin)
// @route   PUT /api/courses/:id/chapters/:chapterId
// @access  Private (subadmin/admin)
export const updateChapter = async (req, res) => {
  try {
    const { title, description, order } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = (course.chapters || []).id(req.params.chapterId) || null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    if (title !== undefined) chapter.title = title;
    if (description !== undefined) chapter.description = description;
    if (order !== undefined) chapter.order = order;

    await course.save();

    res.json(chapter);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course or chapter not found' });
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete chapter (subadmin/admin)
// @route   DELETE /api/courses/:id/chapters/:chapterId
// @access  Private (subadmin/admin)
export const deleteChapter = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapterIndex = (course.chapters || []).findIndex(ch => ch._id.toString() === req.params.chapterId);
    if (chapterIndex === -1) return res.status(404).json({ message: 'Chapter not found' });

    course.chapters.splice(chapterIndex, 1);

    await course.save();

    res.json({ message: 'Chapter deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course not found' });
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update chapter item (subadmin/admin)
// @route   PUT /api/courses/:id/chapters/:chapterId/items/:itemId
// @access  Private (subadmin/admin)
export const updateChapterItem = async (req, res) => {
  try {
    // Check if request has multipart data (file upload)
    const hasFile = req.file || (req.files && (req.files.file || req.files.file0 || Object.values(req.files)[0]));

    let { title, type, url, description, duration, order } = req.body;

    // Handle multipart form data
    if (hasFile) {
      // Normalize file
      let uploadedFile = req.file || (req.files && (req.files.file || req.files.file0 || Object.values(req.files)[0]));
      if (!uploadedFile) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const originalname = uploadedFile.originalname || uploadedFile.name || uploadedFile.filename;
      const tempPath = uploadedFile.path || uploadedFile.tempFilePath || uploadedFile.tmpName || null;

      // Support Buffer uploads (express-fileupload) where file data is in uploadedFile.data
      const hasBufferData = !!uploadedFile.data;
      if (!tempPath && !hasBufferData) {
        console.warn('Uploaded file has no temp path and no buffer data', { uploadedFile });
        return res.status(400).json({ message: 'Uploaded file not available on server' });
      }

      // Determine file type from extension if not provided
      if (!type) {
        const extension = originalname.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') {
          type = 'pdf';
        } else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension)) {
          type = 'video';
        } else {
          type = 'document';
        }
      }

      // Validate that subadmins can only upload video or pdf types
      if (req.user && req.user.role === 'subadmin' && type && !['video', 'pdf'].includes(type)) {
        return res.status(403).json({ message: 'Subadmins can only upload video or PDF files' });
      }

      const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
      const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
      const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
      const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

      if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
        // cleanup
        try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
        return res.status(500).json({ message: 'Appwrite configuration missing' });
      }

      const client = new Client();
      client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
      const storage = new Storage(client);

      // create buffer (from temp path or from buffer) and upload using InputFile
      let fileBuffer = null;
      const tempPathCandidate = tempPath;
      try {
        if (tempPathCandidate && fs.existsSync(tempPathCandidate)) {
          fileBuffer = fs.readFileSync(tempPathCandidate);
        } else if (hasBufferData && Buffer.isBuffer(uploadedFile.data)) {
          fileBuffer = uploadedFile.data;
        } else if (uploadedFile.buffer && Buffer.isBuffer(uploadedFile.buffer)) {
          fileBuffer = uploadedFile.buffer;
        }
      } catch (readErr) {
        console.error('Failed to read uploaded file for Appwrite upload', readErr);
        if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
        return res.status(500).json({ message: 'Failed to read uploaded file' });
      }

      if (!fileBuffer) {
        console.error('No file buffer available for upload', { tempPathCandidate, hasBufferData });
        if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
        return res.status(400).json({ message: 'Uploaded file not available' });
      }

      const fileId = sanitizeFileId(originalname);
      let response;
      try {
        const inputFile = InputFile.fromBuffer(fileBuffer, originalname);
        response = await storage.createFile(APPWRITE_BUCKET_ID, fileId, inputFile);
        console.log('Appwrite upload response', { id: response.$id });
      } catch (e) {
        console.error('Appwrite upload error', e);
        if (tempPathCandidate && fs.existsSync(tempPathCandidate)) try { fs.unlinkSync(tempPathCandidate); } catch (e) {}
        throw e;
      }

      // remove temp file if present
      try { if (tempPathCandidate && fs.existsSync(tempPathCandidate)) fs.unlinkSync(tempPathCandidate); } catch (e) {}

      // Build file URL for reference (optional)
      const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
      const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
      url = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;
    } else {
      // JSON update - validate URL for document types
      if (url !== undefined && type && (type === 'pdf' || type === 'document')) {
        // Check if it's a file name (contains extension and no http/https)
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return res.status(400).json({
            message: 'For PDF/document types, file must be a valid HTTP/HTTPS link or Appwrite URL, not a file name'
          });
        }
      }
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = (course.chapters || []).id(req.params.chapterId) || null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const item = (chapter.items || []).id(req.params.itemId) || null;
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (title !== undefined) item.title = title;
    if (type !== undefined) item.type = type;
    if (url !== undefined) item.url = url;
    if (description !== undefined) item.description = description;
    if (duration !== undefined) item.duration = duration;
    if (order !== undefined) item.order = order;

    await course.save();

    res.json(item);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course, chapter, or item not found' });
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete chapter item (subadmin/admin)
// @route   DELETE /api/courses/:id/chapters/:chapterId/items/:itemId
// @access  Private (subadmin/admin)
export const deleteChapterItem = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const chapter = (course.chapters || []).id(req.params.chapterId) || null;
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const itemIndex = (chapter.items || []).findIndex(item => item._id.toString() === req.params.itemId);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item not found' });

    chapter.items.splice(itemIndex, 1);

    await course.save();

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') return res.status(404).json({ message: 'Course, chapter, or item not found' });
    res.status(500).json({ message: 'Server error' });
  }
};
