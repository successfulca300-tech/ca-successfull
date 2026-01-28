import Resource from '../models/Resource.js';
import { validationResult } from 'express-validator';
import { Client, Storage, InputFile } from 'node-appwrite';
import fs from 'fs';
import { Readable } from 'stream';

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public/Private
export const getResources = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category, type, search, isPublic } = req.query;

    // Build query
    const query = {};

    // If user is not authenticated, only show public resources
    if (!req.user) {
      query.isPublic = true;
    } else if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (category) {
      query.category = category;
    }

    // Allow filtering resources by courseId/testSeriesId/bookId
    if (req.query.courseId) query.courseId = req.query.courseId;
    if (req.query.testSeriesId) query.testSeriesId = req.query.testSeriesId;
    if (req.query.bookId) query.bookId = req.query.bookId;

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$text = { $search: search };
    }

    query.isActive = true;
    // Only show published resources for public access
    query.status = 'published';

    const resources = await Resource.find(query)
      .populate('createdBy', 'name email')
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

// @desc    Get resource by ID
// @route   GET /api/resources/:id
// @access  Public/Private
export const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if resource is public or user is authenticated
    if (!resource.isPublic && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!resource.isActive) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new resource with file upload
// @route   POST /api/resources
// @access  Private
export const createResource = async (req, res) => {
  try {
    // Manual validation for FormData since express-validator doesn't work well with multipart
    let { title, description, category, type, url, tags, isPublic, price, duration } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category is required' });
    }

    // Validate and normalize optional fields
    const allowedTypes = ['document', 'video', 'link', 'file', 'other'];
    const typeMap = {
      pdf: 'document',
      'PDF': 'document',
      book: 'document',
      'Book': 'document',
      notes: 'document',
      'Notes': 'document',
      video: 'video',
      'Video': 'video',
      test: 'other',
      'Test': 'other',
    };

    if (type && !allowedTypes.includes(type)) {
      // try to map UI-specific types to allowed backend types
      const mapped = typeMap[type];
      if (mapped) {
        type = mapped;
      } else {
        return res.status(400).json({ message: `Invalid resource type: ${type}. Allowed types: ${allowedTypes.join(', ')}` });
      }
    }

    // Log for debugging
    console.log('Creating resource with:', { title, description, category, type, url, tags, isPublic });
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');

    // Parse tags if it's a JSON string
    if (tags && typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = [];
      }
    }

    // Parse isPublic if it's a string
    if (typeof isPublic === 'string') {
      isPublic = isPublic === 'true';
    }

    // Map UI types to resourceCategory
    const resourceCategoryMap = {
      pdf: 'notes',
      'PDF': 'notes',
      book: 'notes',
      'Book': 'notes',
      notes: 'notes',
      'Notes': 'notes',
      video: 'video',
      'Video': 'video',
      test: 'test',
      'Test': 'test',
    };

    const resourceCategory = resourceCategoryMap[type] || 'notes';

    // Build resource object
    const resourceData = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      resourceCategory: resourceCategory,
      type: type || 'other',
      url: url || null,
      tags: Array.isArray(tags) ? tags : [],
      isPublic: isPublic !== undefined ? isPublic : true,
      price: price !== undefined ? Number(price) : 0,
      duration: duration !== undefined ? Number(duration) : 0,
      createdBy: req.user._id,
      status: req.user.role === 'admin' ? 'published' : 'draft',
    };

    // If files are uploaded, upload them to Appwrite
    if (req.files) {
      const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
      const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
      const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
      const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

      const appwriteConfigured = !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY && APPWRITE_BUCKET_ID);

      let client = null;
      let storage = null;
      if (appwriteConfigured) {
        client = new Client();
        client
          .setEndpoint(APPWRITE_ENDPOINT)
          .setProject(APPWRITE_PROJECT_ID)
          .setKey(APPWRITE_API_KEY);

        storage = new Storage(client);
      } else {
        console.warn('Appwrite not configured - will use data-URI fallback for thumbnails');
      }

      // Upload main file if provided (supports express-fileupload objects)
      if (req.files && req.files.file) {
        let fileObj = req.files.file;
        if (Array.isArray(fileObj)) fileObj = fileObj[0];
        const tempPath = fileObj.tempFilePath || fileObj.tempPath || fileObj.path;
        const originalName = fileObj.name || fileObj.originalname || fileObj.filename || fileObj.originalName || 'upload';
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Try multiple strategies to obtain a Buffer for the uploaded file
        let fileBuffer = null;
        try {
          if (tempPath && fs.existsSync(tempPath)) {
            fileBuffer = fs.readFileSync(tempPath);
            console.log('Read file from tempPath, size=', fileBuffer.length);
          } else if (fileObj.data && Buffer.isBuffer(fileObj.data)) {
            fileBuffer = fileObj.data;
            console.log('Using fileObj.data buffer, size=', fileBuffer.length);
          } else if (fileObj.buffer && Buffer.isBuffer(fileObj.buffer)) {
            fileBuffer = fileObj.buffer;
            console.log('Using fileObj.buffer, size=', fileBuffer.length);
          } else if (typeof fileObj.mv === 'function') {
            // express-fileupload provides mv(), try to move to a temp file then read
            try {
              const tmpPath = `${require('os').tmpdir()}/upload_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
              await new Promise((resolve, reject) => fileObj.mv(tmpPath, (err) => err ? reject(err) : resolve()));
              if (fs.existsSync(tmpPath)) {
                fileBuffer = fs.readFileSync(tmpPath);
                try { fs.unlinkSync(tmpPath); } catch (e) {}
                console.log('Moved fileObj via mv to tmpPath and read buffer, size=', fileBuffer.length);
              }
            } catch (mvErr) {
              console.warn('fileObj.mv failed', mvErr);
            }
          }
        } catch (readErr) {
          console.error('Error obtaining file buffer:', readErr);
          try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
          return res.status(500).json({ message: `File read failed: ${readErr.message || readErr}` });
        }

        if (!fileBuffer) {
          console.error('No file buffer available for upload', { tempPath, hasData: !!fileObj.data, hasBuffer: !!fileObj.buffer });
          try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
          return res.status(500).json({ message: 'File upload failed: uploaded file is missing or unreadable' });
        }

        try {
          // Use Appwrite SDK to upload file - convert Buffer to InputFile
          console.log('Uploading file to Appwrite with ID:', fileId, 'Size:', fileBuffer.length);
          
          const inputFile = InputFile.fromBuffer(fileBuffer, originalName);
          const uploadedFile = await storage.createFile(
            APPWRITE_BUCKET_ID,
            fileId,
            inputFile
          );
          
          console.log('File uploaded successfully:', uploadedFile.$id);
          
          const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
          const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
          const fileUrl = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${APPWRITE_PROJECT_ID}`;

          resourceData.fileUrl = fileUrl;
          resourceData.fileName = originalName;
          resourceData.fileId = uploadedFile.$id;

          try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
        } catch (uploadError) {
          console.error('File upload error:', uploadError && uploadError.message ? uploadError.message : uploadError);
          console.error('Full error:', uploadError);
          try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
          const errMsg = uploadError && uploadError.message ? uploadError.message : String(uploadError);
          return res.status(500).json({ message: `File upload failed: ${errMsg}`, error: errMsg });
        }
      }

      // Upload thumbnail if provided
      if (req.files && req.files.thumbnail) {
        let thumbObj = req.files.thumbnail;
        if (Array.isArray(thumbObj)) thumbObj = thumbObj[0];
        const tempThumbPath = thumbObj.tempFilePath || thumbObj.tempPath || thumbObj.path;
        const thumbName = thumbObj.name || thumbObj.originalname || thumbObj.filename || 'thumb';
        const thumbnailId = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let thumbBuffer = null;
        try {
          if (tempThumbPath && fs.existsSync(tempThumbPath)) {
            thumbBuffer = fs.readFileSync(tempThumbPath);
            console.log('Read thumbnail from tempPath, size=', thumbBuffer.length);
          } else if (thumbObj.data && Buffer.isBuffer(thumbObj.data)) {
            thumbBuffer = thumbObj.data;
            console.log('Using thumbObj.data buffer, size=', thumbBuffer.length);
          } else if (thumbObj.buffer && Buffer.isBuffer(thumbObj.buffer)) {
            thumbBuffer = thumbObj.buffer;
            console.log('Using thumbObj.buffer, size=', thumbBuffer.length);
          } else if (typeof thumbObj.mv === 'function') {
            try {
              const tmpPath = `${require('os').tmpdir()}/thumb_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
              await new Promise((resolve, reject) => thumbObj.mv(tmpPath, (err) => err ? reject(err) : resolve()));
              if (fs.existsSync(tmpPath)) {
                thumbBuffer = fs.readFileSync(tmpPath);
                try { fs.unlinkSync(tmpPath); } catch (e) {}
                console.log('Moved thumbObj via mv to tmpPath and read buffer, size=', thumbBuffer.length);
              }
            } catch (mvErr) {
              console.warn('thumbObj.mv failed', mvErr);
            }
          }
        } catch (tReadErr) {
          console.error('Error obtaining thumbnail buffer:', tReadErr);
          try { if (tempThumbPath && fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath); } catch (e) {}
          return res.status(500).json({ message: `Thumbnail read failed: ${tReadErr.message || tReadErr}` });
        }

        if (!thumbBuffer) {
          console.error('No thumbnail buffer available for upload', { tempThumbPath, hasData: !!thumbObj.data, hasBuffer: !!thumbObj.buffer });
          try { if (tempThumbPath && fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath); } catch (e) {}
          return res.status(500).json({ message: 'Thumbnail upload failed: thumbnail file is missing or unreadable' });
        }

        try {
          if (storage && appwriteConfigured) {
            // Use Appwrite SDK to upload thumbnail - convert Buffer to InputFile
            console.log('Uploading thumbnail to Appwrite with ID:', thumbnailId, 'Size:', thumbBuffer.length);
            const inputThumbnail = InputFile.fromBuffer(thumbBuffer, thumbName);
            const uploadedThumbnail = await storage.createFile(
              APPWRITE_BUCKET_ID,
              thumbnailId,
              inputThumbnail
            );

            console.log('Thumbnail uploaded successfully:', uploadedThumbnail.$id);

            // Build Appwrite view URL for thumbnail (include /v1)
            const _baseThumb = APPWRITE_ENDPOINT.replace(/\/$/, '');
            const endpointWithV1Thumb = _baseThumb.endsWith('/v1') ? _baseThumb : `${_baseThumb}/v1`;
            const thumbnailUrlFull = `${endpointWithV1Thumb}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${uploadedThumbnail.$id}/view?project=${APPWRITE_PROJECT_ID}`;

            resourceData.thumbnail = thumbnailUrlFull;
            resourceData.thumbnailFileId = uploadedThumbnail.$id;
          } else {
            // Appwrite not configured - fallback to storing base64 data URI so the UI can display thumbnail
            try {
              const extMatch = (thumbName || '').split('.').pop();
              const mime = extMatch ? `image/${extMatch.toLowerCase()}` : 'image/png';
              const base64 = thumbBuffer.toString('base64');
              resourceData.thumbnail = `data:${mime};base64,${base64}`;
              console.warn('Stored thumbnail as base64 data URI (Appwrite not configured)');
            } catch (fallbackErr) {
              console.error('Thumbnail fallback to data URI failed:', fallbackErr);
            }
          }

          try { if (tempThumbPath && fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath); } catch (e) {}
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError && uploadError.message ? uploadError.message : uploadError);
          console.error('Full error:', uploadError);
          try { if (tempThumbPath && fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath); } catch (e) {}
          const errMsg = uploadError && uploadError.message ? uploadError.message : String(uploadError);
          // Don't abort the whole request for thumbnail upload failure; log and continue without thumbnail
          console.warn('Continuing request without thumbnail due to upload error:', errMsg);
        }
      }
    }

    const resource = await Resource.create(resourceData);

    const populatedResource = await Resource.findById(resource._id).populate(
      'createdBy',
      'name email'
    );

    res.status(201).json(populatedResource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private
export const updateResource = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if user is the creator or admin
    if (
      resource.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, type, url, tags, isPublic, isActive } =
      req.body;

    resource.title = title || resource.title;
    resource.description = description || resource.description;
    resource.category = category || resource.category;
    if (type) {
      resource.type = type;
      // Update resourceCategory based on type
      const resourceCategoryMap = {
        pdf: 'notes',
        'PDF': 'notes',
        book: 'notes',
        'Book': 'notes',
        notes: 'notes',
        'Notes': 'notes',
        video: 'video',
        'Video': 'video',
        test: 'test',
        'Test': 'test',
      };
      resource.resourceCategory = resourceCategoryMap[type] || 'notes';
    }
    if (url !== undefined) resource.url = url;
    if (tags) resource.tags = tags;
    if (isPublic !== undefined) resource.isPublic = isPublic;
    if (isActive !== undefined && req.user.role === 'admin')
      resource.isActive = isActive;

    const updatedResource = await resource.save();

    const populatedResource = await Resource.findById(
      updatedResource._id
    ).populate('createdBy', 'name email');

    res.json(populatedResource);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Check if user is the creator or admin
    if (
      resource.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // If resource references Appwrite file ids, attempt to remove files
    try {
      const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
      const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
      const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
      const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;
      if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY && APPWRITE_BUCKET_ID) {
        const { Storage, Client } = await import('node-appwrite');
        const client = new Client();
        client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
        const storage = new Storage(client);
        // resource may have fileId or thumbnailFileId
        if (resource.fileId) {
          try { await storage.deleteFile(APPWRITE_BUCKET_ID, resource.fileId); } catch (e) { console.warn('Failed to delete appwrite file', e.message || e); }
        }
        if (resource.thumbnailFileId) {
          try { await storage.deleteFile(APPWRITE_BUCKET_ID, resource.thumbnailFileId); } catch (e) { console.warn('Failed to delete appwrite thumb', e.message || e); }
        }
      }
    } catch (err) {
      console.warn('Error during file removal', err);
    }

    await resource.deleteOne();

    res.json({ message: 'Resource removed' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get resources by category
// @route   GET /api/resources/category/:category
// @access  Public
export const getResourcesByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type, search, isPublic } = req.query;
    const category = req.params.category;

    // Build query
    const query = {
      category: category,
      isActive: true,
      status: 'published'
    };

    // If user is not authenticated, only show public resources
    if (!req.user) {
      query.isPublic = true;
    } else if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const resources = await Resource.find(query)
      .populate('createdBy', 'name email')
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

// @desc    Get user's resources
// @route   GET /api/resources/user
// @access  Private
export const getUserResources = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Increased default limit to show all resources
    const skip = (page - 1) * limit;
    const { status, category } = req.query;

    const query = {
      createdBy: req.user._id,
    };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const resources = await Resource.find(query)
      .populate('createdBy', 'name email')
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


