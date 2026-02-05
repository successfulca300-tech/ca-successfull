import Resource from '../models/Resource.js';
import Course from '../models/Course.js';
import Book from '../models/Book.js';
import TestSeries from '../models/TestSeries.js';
import FreeResource from '../models/FreeResource.js';
import Category from '../models/Category.js';
import { Client, Storage, InputFile } from 'node-appwrite';
import fs from 'fs';

// Helper function to upload file to Appwrite
const uploadToAppwrite = async (fileBuffer, fileName) => {
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
  const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
    throw new Error('Appwrite configuration missing');
  }

  const client = new Client();
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const storage = new Storage(client);
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const inputFile = InputFile.fromBuffer(fileBuffer, fileName);
  const uploadedFile = await storage.createFile(
    APPWRITE_BUCKET_ID,
    fileId,
    inputFile
  );

  const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
  const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
  const fileUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${APPWRITE_PROJECT_ID}`;

  return { fileUrl, fileId: uploadedFile.$id };
};

// @desc    Create resource - determines type and stores in appropriate collection
// @route   POST /api/resources/create-typed
// @access  Private
export const createTypedResource = async (req, res) => {
  try {
    const { title, description, category, resourceCategory, price, tags, courseId, bookId, testSeriesId } = req.body;

    console.log('Received request body:', { title, description, category, resourceCategory });

    // Validate required fields
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ message: 'Description is required' });
    if (!category) return res.status(400).json({ message: 'Category is required' });
    if (!resourceCategory) return res.status(400).json({ message: 'Resource category is required' });

    const validCategories = ['video', 'book', 'test', 'notes'];
    if (!validCategories.includes(resourceCategory)) {
      return res.status(400).json({ message: 'Invalid resource category' });
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = [];
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Normalize price (treat missing/NaN as 0)
    const priceNum = Number(price) || 0;

    let fileUrl = null;
    let fileId = null;
    let fileName = null;
    let thumbnailUrl = null;

    // Upload file if provided
    if (req.files?.file) {
      let fileObj = req.files.file;
      if (Array.isArray(fileObj)) fileObj = fileObj[0];
      const tempPath = fileObj.tempFilePath || fileObj.tempPath || fileObj.path;
      const originalName = fileObj.name || fileObj.originalname || fileObj.filename || 'upload';

      let fileBuffer = null;
      try {
        if (tempPath && fs.existsSync(tempPath)) {
          fileBuffer = fs.readFileSync(tempPath);
        } else if (fileObj.data && Buffer.isBuffer(fileObj.data)) {
          fileBuffer = fileObj.data;
        } else if (fileObj.buffer && Buffer.isBuffer(fileObj.buffer)) {
          fileBuffer = fileObj.buffer;
        }
      } catch (readErr) {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return res.status(500).json({ message: `File read failed: ${readErr.message}` });
      }

      if (fileBuffer) {
        try {
          const uploadResult = await uploadToAppwrite(fileBuffer, originalName);
          fileUrl = uploadResult.fileUrl;
          fileId = uploadResult.fileId;
          fileName = originalName;
        } catch (uploadError) {
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          return res.status(500).json({ message: `File upload failed: ${uploadError.message}` });
        }
      }

      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    // Upload thumbnail if provided
    if (req.files?.thumbnail) {
      let thumbObj = req.files.thumbnail;
      if (Array.isArray(thumbObj)) thumbObj = thumbObj[0];
      const tempPath = thumbObj.tempFilePath || thumbObj.tempPath || thumbObj.path;
      const originalName = thumbObj.name || thumbObj.originalname || thumbObj.filename || 'thumbnail';

      let thumbBuffer = null;
      try {
        if (tempPath && fs.existsSync(tempPath)) {
          thumbBuffer = fs.readFileSync(tempPath);
        } else if (thumbObj.data && Buffer.isBuffer(thumbObj.data)) {
          thumbBuffer = thumbObj.data;
        } else if (thumbObj.buffer && Buffer.isBuffer(thumbObj.buffer)) {
          thumbBuffer = thumbObj.buffer;
        }
      } catch (readErr) {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        // Don't fail if thumbnail upload fails, just log it
        console.warn('Thumbnail read failed:', readErr.message);
      }

      if (thumbBuffer) {
        try {
          const uploadResult = await uploadToAppwrite(thumbBuffer, originalName);
              // Store full Appwrite view URL in DB so frontend can load it directly
              thumbnailUrl = uploadResult.fileUrl;
        } catch (uploadError) {
          // If Appwrite isn't configured or upload fails, fallback to data URI so UI can display
          try {
            const extMatch = (originalName || '').split('.').pop();
            const mime = extMatch ? `image/${extMatch.toLowerCase()}` : 'image/png';
            const base64 = thumbBuffer.toString('base64');
            thumbnailUrl = `data:${mime};base64,${base64}`;
            console.warn('Appwrite upload failed, using base64 data uri for thumbnail');
          } catch (fallbackErr) {
            console.warn('Thumbnail upload failed and fallback also failed:', uploadError?.message, fallbackErr?.message);
          }
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      }

      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    let createdResourceId = null;

    // Store in appropriate collection based on resourceCategory
    switch (resourceCategory) {
      case 'video': {
        // For video, create a new Course entry to store the video
        const courseData = {
          title: title.trim(),
          description: description.trim(),
          category: category,
          instructor: req.user._id,
          videoUrl: fileUrl || '',
          thumbnail: thumbnailUrl || '',
          price: Number(price) || 0,
          createdBy: req.user._id,
          publishStatus: 'draft',
          isPublished: false,
        };

        const course = await Course.create(courseData);
        createdResourceId = course._id;
        break;
      }

      case 'book': {
        const bookData = {
          title: title.trim(),
          description: description.trim(),
          category: category,
          thumbnail: thumbnailUrl || '',
          fileUrl,
          fileName,
          fileId,
          price: Number(price) || 0,
          createdBy: req.user._id,
          publishStatus: 'draft',
        };

        const book = await Book.create(bookData);
        createdResourceId = book._id;
        break;
      }

      case 'test': {
        // For test, create a new TestSeries entry
        const testSeriesData = {
          title: title.trim(),
          description: description.trim(),
          category: category,
          thumbnail: thumbnailUrl || '',
          price: Number(price) || 0,
          totalTests: 1, // Default to 1 test
          tests: [
            {
              title: title.trim(),
              duration: 60, // Default 60 minutes
              totalQuestions: 50, // Default questions
              pdfUrl: fileUrl || '',
            }
          ],
          createdBy: req.user._id,
          publishStatus: 'draft', // Changed to draft, not pending
        };

        const testSeries = await TestSeries.create(testSeriesData);
        createdResourceId = testSeries._id;
        break;
      }

      case 'notes': {
        const freeResourceData = {
          title: title.trim(),
          description: description.trim(),
          category: category,
          thumbnail: thumbnailUrl || '',
          fileUrl,
          fileName,
          fileId,
          resourceType: 'notes',
          tags: parsedTags,
          createdBy: req.user._id,
          // Auto-publish if this is a free (price 0) upload
          publishStatus: priceNum === 0 ? 'published' : 'draft',
          isPublished: priceNum === 0 ? true : false,
        };

        const freeResource = await FreeResource.create(freeResourceData);
        createdResourceId = freeResource._id;
        break;
      }
    }

    // Create entry in Resource collection for tracking
    const resourceData = {
      title: title.trim(),
      description: description.trim(),
      category: category,
      resourceCategory,
      type: resourceCategory === 'video' ? 'video' : 'document',
      fileUrl,
      fileName,
      price: priceNum,
      thumbnail: thumbnailUrl || '',
      tags: parsedTags,
      createdBy: req.user._id,
      // If author is admin OR this is a free notes upload, publish immediately and make public
      status: (req.user.role === 'admin' || (resourceCategory === 'notes' && priceNum === 0)) ? 'published' : 'draft',
      isPublic: resourceCategory === 'notes' && priceNum === 0 ? true : undefined,
    };

    // Map resourceCategory to specific ID
    if (resourceCategory === 'video') resourceData.courseId = createdResourceId;
    else if (resourceCategory === 'book') resourceData.bookId = createdResourceId;
    else if (resourceCategory === 'test') resourceData.testSeriesId = createdResourceId;
    else if (resourceCategory === 'notes') resourceData.freeResourceId = createdResourceId;

    const resource = await Resource.create(resourceData);

    console.log('Resource created successfully:', resource._id);

    res.status(201).json({
      message: 'Resource created successfully and awaiting approval',
      resource,
      collectionId: createdResourceId,
      resourceCategory,
    });
  } catch (error) {
    console.error('Error in createTypedResource:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve published resource - move to published in respective collection
// @route   PUT /api/resources/:id/approve
// @access  Admin only
export const approveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Update resource status
    resource.status = 'published';
    await resource.save();

    // Update respective collection
    const { resourceCategory } = resource;

    switch (resourceCategory) {
      case 'video': {
        const course = await Course.findById(resource.courseId);
        if (course) {
          course.publishStatus = 'published';
          course.isPublished = true;
          await course.save();
        }
        break;
      }

      case 'book': {
        const book = await Book.findById(resource.bookId);
        if (book) {
          book.publishStatus = 'published';
          book.isPublished = true;
          await book.save();
        }
        break;
      }

      case 'test': {
        const testSeries = await TestSeries.findById(resource.testSeriesId);
        if (testSeries) {
          testSeries.publishStatus = 'published';
          await testSeries.save();
        }
        break;
      }

      case 'notes': {
        const freeResource = await FreeResource.findById(resource.freeResourceId);
        if (freeResource) {
          freeResource.publishStatus = 'published';
          freeResource.isPublished = true;
          await freeResource.save();
        }
        break;
      }
    }

    res.json({ message: 'Resource approved and published', resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject resource
// @route   PUT /api/resources/:id/reject
// @access  Admin only
export const rejectResource = async (req, res) => {
  try {
    const { reason } = req.body;

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    resource.status = 'rejected';
    resource.adminComment = reason || '';
    await resource.save();

    // Update respective collection
    const { resourceCategory } = resource;

    switch (resourceCategory) {
      case 'video': {
        const course = await Course.findById(resource.courseId);
        if (course) {
          course.publishStatus = 'rejected';
          course.publishNotes = reason || '';
          await course.save();
        }
        break;
      }

      case 'book': {
        const book = await Book.findById(resource.bookId);
        if (book) {
          book.publishStatus = 'rejected';
          book.publishNotes = reason || '';
          await book.save();
        }
        break;
      }

      case 'test': {
        const testSeries = await TestSeries.findById(resource.testSeriesId);
        if (testSeries) {
          testSeries.publishStatus = 'rejected';
          await testSeries.save();
        }
        break;
      }

      case 'notes': {
        const freeResource = await FreeResource.findById(resource.freeResourceId);
        if (freeResource) {
          freeResource.publishStatus = 'rejected';
          freeResource.publishNotes = reason || '';
          await freeResource.save();
        }
        break;
      }
    }

    res.json({ message: 'Resource rejected', resource });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all pending resources for admin approval
// @route   GET /api/resources/pending
// @access  Admin only
export const getPendingResources = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { resourceCategory } = req.query;

    const query = { status: 'pending' };

    if (resourceCategory && ['video', 'book', 'test', 'notes'].includes(resourceCategory)) {
      query.resourceCategory = resourceCategory;
    }

    const resources = await Resource.find(query)
      .populate('createdBy', 'name email')
      .populate('courseId')
      .populate('bookId')
      .populate('testSeriesId')
      .populate('freeResourceId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Resource.countDocuments(query);

    res.json({
      resources,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get published resources by type
// @route   GET /api/resources/published/:resourceCategory
// @access  Public
export const getPublishedResourcesByType = async (req, res) => {
  try {
    // #region agent log
    const logPath = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'typedResourceController.js:456',
      message: 'getPublishedResourcesByType entry',
      data: { resourceCategory: req.params.resourceCategory, category: req.query.category, page: req.query.page },
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    // #endregion

    const { resourceCategory } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category } = req.query;

    if (!['video', 'book', 'test', 'notes'].includes(resourceCategory)) {
      return res.status(400).json({ message: 'Invalid resource category' });
    }

    let resources = [];
    let total = 0;

    // For books, test series, and notes, query directly from their collections
    if (resourceCategory === 'book') {
      // #region agent log
      const logPathBook = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
      const logEntry2 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:472',
        message: 'Processing book resourceCategory',
        data: { resourceCategory, category },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      };
      fs.appendFileSync(logPathBook, JSON.stringify(logEntry2) + '\n');
      // #endregion

      const query = {
        publishStatus: 'published',
        isPublished: true,
        isActive: true,
      };

      // Handle category filter - can be category name or ID
      if (category && category !== 'All') {
        // Try to find category by name first, then by ID
        const foundCategory = await Category.findOne({
          $or: [
            { name: category },
            { _id: category }
          ]
        });
        
        if (foundCategory) {
          query.category = foundCategory._id;
        } else {
          // #region agent log
          const logPath2 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
          const logEntry3 = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            location: 'typedResourceController.js:499',
            message: 'Category not found for books',
            data: { category },
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          };
          fs.appendFileSync(logPath2, JSON.stringify(logEntry3) + '\n');
          // #endregion
          // If category not found, return empty results
          return res.json({
            resources: [],
            page,
            pages: 0,
            total: 0,
          });
        }
      }

      resources = await Book.find(query)
        .populate('createdBy', 'name email')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      total = await Book.countDocuments(query);

      // #region agent log
      const logEntry4 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:512',
        message: 'Books query result',
        data: { bookCount: resources.length, total, query },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      };
      fs.appendFileSync(logPathBook, JSON.stringify(logEntry4) + '\n');
      // #endregion

      // Convert to array of objects
      resources = resources.map(book => book.toObject());

    } else if (resourceCategory === 'test') {
      // #region agent log
      const logPath3 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
      const logEntry5 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:514',
        message: 'Processing test resourceCategory',
        data: { resourceCategory, category },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      };
      fs.appendFileSync(logPath3, JSON.stringify(logEntry5) + '\n');
      // #endregion

      const query = {
        publishStatus: 'published',
        isActive: true,
      };

      // Handle category filter - can be category name or ID
      if (category && category !== 'All') {
        // Try to find category by name first, then by ID
        const foundCategory = await Category.findOne({
          $or: [
            { name: category },
            { _id: category }
          ]
        });
        
        if (foundCategory) {
          query.category = foundCategory._id;
        } else {
          // #region agent log
          const logPath4 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
          const logEntry6 = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            location: 'typedResourceController.js:540',
            message: 'Category not found for tests',
            data: { category },
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          };
          fs.appendFileSync(logPath4, JSON.stringify(logEntry6) + '\n');
          // #endregion
          // If category not found, return empty results
          return res.json({
            resources: [],
            page,
            pages: 0,
            total: 0,
          });
        }
      }

      resources = await TestSeries.find(query)
        .populate('createdBy', 'name email')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      total = await TestSeries.countDocuments(query);

      // #region agent log
      const logEntry7 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:550',
        message: 'TestSeries query result',
        data: { testCount: resources.length, total, query },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      };
      fs.appendFileSync(logPath3, JSON.stringify(logEntry7) + '\n');
      // #endregion

      // Convert to array of objects and add duration from tests array
      resources = resources.map(testSeries => {
        const testObj = testSeries.toObject();
        testObj.duration = testSeries.tests?.[0]?.duration || 60;
        return testObj;
      });

    } else if (resourceCategory === 'notes') {
      // #region agent log
      const logPath4 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
      const logEntry10 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:552',
        message: 'Processing notes resourceCategory',
        data: { resourceCategory, category },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      };
      fs.appendFileSync(logPath4, JSON.stringify(logEntry10) + '\n');
      // #endregion

      const query = {
        publishStatus: 'published',
        isPublished: true,
        isActive: true,
        resourceType: { $in: ['notes', 'document'] },
      };

      // Handle category filter - can be category name or ID
      if (category && category !== 'All') {
        // Try to find category by name first, then by ID
        const foundCategory = await Category.findOne({
          $or: [
            { name: category },
            { _id: category }
          ]
        });

        if (foundCategory) {
          query.category = foundCategory._id;
        } else {
          // #region agent log
          const logPath5 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
          const logEntry11 = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            location: 'typedResourceController.js:578',
            message: 'Category not found for notes',
            data: { category },
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'E'
          };
          fs.appendFileSync(logPath5, JSON.stringify(logEntry11) + '\n');
          // #endregion
          // If category not found, return empty results
          return res.json({
            resources: [],
            page,
            pages: 0,
            total: 0,
          });
        }
      }

      // First get all free resources (FreeResource collection)
      const allFreeResources = await FreeResource.find(query)
        .populate('createdBy', 'name email role')
        .populate('category', 'name')
        .sort({ createdAt: -1 });

      // Also include note-type entries that are stored in the Resource collection and are published & public
      const resourceQuery = {
        resourceCategory: 'notes',
        status: 'published',
        isActive: true,
        isPublic: true,
        $or: [
          { price: 0 },
          { freeResourceId: { $exists: true, $ne: null } }
        ]
      };

      const resourceNotes = await Resource.find(resourceQuery)
        .populate('createdBy', 'name email role')
        .populate('freeResourceId')
        .populate('category', 'name')
        .sort({ createdAt: -1 });

      // Map FreeResource docs to objects
      const freeList = allFreeResources.map(fr => fr.toObject());

      // Map Resource docs (that are not duplicates of FreeResource entries) into compatible objects
      const fromResourceList = resourceNotes
        .map((r) => {
          // If linked FreeResource exists and is already included above, skip (we will dedupe)
          if (r.freeResourceId && r.freeResourceId._id) return null;

          const obj = r.toObject();
          // Normalize shape similar to FreeResource
          return {
            ...obj,
            _id: obj._id,
            title: obj.title || obj.fileName || obj.fileUrl,
            description: obj.description || '',
            thumbnail: obj.thumbnail || '',
            fileUrl: obj.fileUrl || '',
            fileName: obj.fileName || '',
            resourceType: 'notes',
          };
        })
        .filter(Boolean);

      // Combine and dedupe by _id
      const combined = [...freeList, ...fromResourceList];
      const seen = new Set();
      const finalResources = combined.filter(item => {
        const key = (item._id && item._id.toString && item._id.toString()) || JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      total = finalResources.length;
      resources = finalResources.slice(skip, skip + limit);

      // #region agent log
      const logEntry12 = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        location: 'typedResourceController.js:591',
        message: 'FreeResource query result',
        data: { notesCount: resources.length, total, query },
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      };
      fs.appendFileSync(logPath4, JSON.stringify(logEntry12) + '\n');
      // #endregion

      // Convert to array of objects
      resources = resources.map(freeResource => freeResource.toObject());

    } else {
      // For video and notes, use the Resource collection approach
      const query = {
        resourceCategory,
        status: 'published',
        isActive: true,
      };

      let allResources = await Resource.find(query)
        .populate('createdBy', 'name email')
        .populate('courseId')
        .populate('bookId')
        .populate('testSeriesId')
        .populate('freeResourceId')
        .populate({
          path: 'bookId',
          populate: { path: 'category', select: 'name' }
        })
        .populate({
          path: 'testSeriesId',
          populate: { path: 'category', select: 'name' }
        })
        .populate({
          path: 'courseId',
          populate: { path: 'category', select: 'name' }
        })
        .populate({
          path: 'freeResourceId',
          populate: { path: 'category', select: 'name' }
        })
        .sort({ createdAt: -1 });

      // Filter resources where the underlying content is also published
      const filteredResources = allResources.filter((resource) => {
        // Check if underlying content is published
        let isContentPublished = false;
        
        if (resourceCategory === 'video' && resource.courseId) {
          const course = resource.courseId;
          isContentPublished = course.publishStatus === 'published' && course.isPublished === true;
        } else if (resourceCategory === 'notes' && resource.freeResourceId) {
          const freeResource = resource.freeResourceId;
          isContentPublished = freeResource.publishStatus === 'published' && freeResource.isPublished === true;
        }

        if (!isContentPublished) {
          return false;
        }

        // Apply category filter if provided
        if (category && category !== 'All') {
          let categoryMatch = false;
          
          // Helper function to check category match
          const checkCategoryMatch = (cat) => {
            if (!cat) return false;
            if (typeof cat === 'object' && cat !== null) {
              return cat.name === category || cat._id?.toString() === category;
            }
            if (typeof cat === 'string') {
              return cat === category;
            }
            return false;
          };
          
          if (resourceCategory === 'video' && resource.courseId) {
            const course = resource.courseId;
            const courseCategory = course.category;
            categoryMatch = checkCategoryMatch(courseCategory) || resource.category === category;
          } else if (resourceCategory === 'notes' && resource.freeResourceId) {
            const freeResource = resource.freeResourceId;
            const notesCategory = freeResource.category;
            categoryMatch = checkCategoryMatch(notesCategory) || resource.category === category;
          } else {
            categoryMatch = resource.category === category;
          }
          
          return categoryMatch;
        }

        return true;
      });

      total = filteredResources.length;
      const paginatedResources = filteredResources.slice(skip, skip + limit);

      // Merge Resource data with underlying content data
      resources = paginatedResources.map((resource) => {
        const resourceObj = resource.toObject();
        let contentData = {};

        if (resourceCategory === 'video' && resource.courseId) {
          const course = resource.courseId.toObject();
          contentData = {
            title: course.title || resourceObj.title,
            description: course.description || resourceObj.description,
            thumbnail: course.thumbnail || resourceObj.thumbnail,
            videoUrl: course.videoUrl || resourceObj.fileUrl,
            category: course.category || resourceObj.category,
            _id: course._id || resourceObj._id,
          };
        } else if (resourceCategory === 'notes' && resource.freeResourceId) {
          const freeResource = resource.freeResourceId.toObject();
          contentData = {
            title: freeResource.title || resourceObj.title,
            description: freeResource.description || resourceObj.description,
            thumbnail: freeResource.thumbnail || resourceObj.thumbnail,
            fileUrl: freeResource.fileUrl || resourceObj.fileUrl,
            fileName: freeResource.fileName || resourceObj.fileName,
            category: freeResource.category || resourceObj.category,
            _id: freeResource._id || resourceObj._id,
          };
        }

        return {
          ...resourceObj,
          ...contentData,
          resourceCategory: resourceObj.resourceCategory,
          status: resourceObj.status,
          createdBy: resourceObj.createdBy,
        };
      });
    }

    // #region agent log
    const logPath5 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
    
    // Check if courses exist and should be included
    const publishedCoursesCount = await Course.countDocuments({ 
      publishStatus: 'published', 
      isPublished: true, 
      isActive: true 
    });
    const coursesWithResourceCount = await Resource.countDocuments({ 
      resourceCategory: 'video', 
      status: 'published',
      courseId: { $exists: true, $ne: null }
    });
    
    const logEntry8 = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'typedResourceController.js:683',
      message: 'Final response data',
      data: { 
        resourceCategory, 
        resourcesCount: resources.length, 
        total,
        publishedCoursesCount,
        coursesWithResourceCount
      },
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fs.appendFileSync(logPath5, JSON.stringify(logEntry8) + '\n');
    // #endregion

    res.json({
      resources,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    // #region agent log
    const logPath6 = 'c:\\Users\\sachi\\OneDrive\\Desktop\\Projects\\ca-successful\\.cursor\\debug.log';
    const logEntry9 = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'typedResourceController.js:692',
      message: 'Error in getPublishedResourcesByType',
      data: { error: error.message, stack: error.stack },
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fs.appendFileSync(logPath6, JSON.stringify(logEntry9) + '\n');
    // #endregion
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  createTypedResource,
  approveResource,
  rejectResource,
  getPendingResources,
  getPublishedResourcesByType,
};
