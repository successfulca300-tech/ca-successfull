import PublishRequest from '../models/PublishRequest.js';
import Course from '../models/Course.js';
import TestSeries from '../models/TestSeries.js';
import Resource from '../models/Resource.js';
import Book from '../models/Book.js';
import FreeResource from '../models/FreeResource.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

// Helper: resolve test series by _id or shorthand seriesType like 's1'
const resolveTestSeries = async (identifier) => {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(String(identifier))) {
    return await TestSeries.findById(identifier);
  }
  const seriesType = String(identifier || '').toUpperCase();
  if (['S1','S2','S3','S4'].includes(seriesType)) {
    return await TestSeries.findOne({ seriesType });
  }
  return null;
};

// @desc    Get all publish requests (admin)
// @route   GET /api/publish-requests
// @access  Private/Admin
export const getPublishRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, contentType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (contentType) query.contentType = contentType;

    const requests = await PublishRequest.find(query)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PublishRequest.countDocuments(query);

    // Populate content details based on type
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const reqObj = r.toObject();
        if (r.contentType === 'course') {
          const content = await Course.findById(r.contentId).select('title description');
          reqObj.contentTitle = content?.title || 'Unknown';
          reqObj.content = content;
        } else if (r.contentType === 'testSeries') {
          const content = await resolveTestSeries(r.contentId);
          reqObj.contentTitle = content?.title || 'Unknown';
          reqObj.content = content;
        } else if (r.contentType === 'resource') {
          const content = await Resource.findById(r.contentId).select('title description');
          reqObj.contentTitle = content?.title || 'Unknown';
          reqObj.content = content;
        }
        return reqObj;
      })
    );

    res.json({
      requests: enrichedRequests,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get publish requests for current user
// @route   GET /api/publish-requests/user
// @access  Private
export const getUserPublishRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, contentType } = req.query;

    const query = { requestedBy: req.user._id };
    if (status) query.status = status;
    if (contentType) query.contentType = contentType;

    const requests = await PublishRequest.find(query)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PublishRequest.countDocuments(query);

    // Populate content details based on type
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        const reqObj = r.toObject();
        if (r.contentType === 'course') {
          reqObj.content = await Course.findById(r.contentId).select('title description');
        } else if (r.contentType === 'testSeries') {
          reqObj.content = await resolveTestSeries(r.contentId);
        } else if (r.contentType === 'resource') {
          reqObj.content = await Resource.findById(r.contentId).select('title description thumbnail');
        }
        return reqObj;
      })
    );

    res.json({ requests: enrichedRequests, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get publish request by ID
// @route   GET /api/publish-requests/:id
// @access  Private
export const getPublishRequestById = async (req, res) => {
  try {
    const publishRequest = await PublishRequest.findById(req.params.id)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name');

    if (!publishRequest) {
      return res.status(404).json({ message: 'Publish request not found' });
    }

    res.json(publishRequest);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Publish request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create publish request (subadmin/user)
// @route   POST /api/publish-requests
// @access  Private
export const createPublishRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contentType, contentId, requestNotes, notes } = req.body;
    const requestNotesFinal = requestNotes || notes;

    // Verify content exists and user is creator
    let content;
    if (contentType === 'course') {
      content = await Course.findById(contentId);
      if (!content || content.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to request publish for this content' });
      }
    } else if (contentType === 'testSeries') {
      content = await resolveTestSeries(contentId);
      if (!content || (content.createdBy && content.createdBy.toString() !== req.user._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to request publish for this content' });
      }
    } else if (contentType === 'resource') {
      content = await Resource.findById(contentId);
      if (!content || content.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to request publish for this content' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    // Check if request already exists
    const existingRequest = await PublishRequest.findOne({ contentId, contentType, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: 'A pending publish request already exists for this content' });
    }

    const publishRequest = await PublishRequest.create({
      contentType,
      contentId,
      requestedBy: req.user._id,
      requestNotes: requestNotesFinal,
      status: 'pending',
    });

    // Update resource status to pending if it's a Resource type
    if (contentType === 'resource' && content) {
      content.status = 'pending';
      await content.save();
    }

    const populatedRequest = await PublishRequest.findById(publishRequest._id)
      .populate('requestedBy', 'name email');

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve/Reject publish request (admin)
// @route   PUT /api/publish-requests/:id/moderate
// @access  Private/Admin
export const moderatePublishRequest = async (req, res) => {
  try {
    const publishRequest = await PublishRequest.findById(req.params.id);
    if (!publishRequest) {
      return res.status(404).json({ message: 'Publish request not found' });
    }

    const { action, rejectionReason } = req.body;

    if (action === 'approve') {
      publishRequest.status = 'approved';
      publishRequest.approvedBy = req.user._id;
      publishRequest.reviewDate = new Date();

      // Update content status
      if (publishRequest.contentType === 'course') {
        await Course.findByIdAndUpdate(publishRequest.contentId, { publishStatus: 'published', isPublished: true });
      } else if (publishRequest.contentType === 'testSeries') {
        // handle shorthand 's1' etc.
        if (mongoose.Types.ObjectId.isValid(String(publishRequest.contentId))) {
          await TestSeries.findByIdAndUpdate(publishRequest.contentId, { publishStatus: 'published' });
        } else {
          const seriesType = String(publishRequest.contentId || '').toUpperCase();
          if (['S1','S2','S3','S4'].includes(seriesType)) {
            await TestSeries.findOneAndUpdate({ seriesType }, { publishStatus: 'published' });
          }
        }
      } else if (publishRequest.contentType === 'resource') {
        const resource = await Resource.findById(publishRequest.contentId);
        await Resource.findByIdAndUpdate(publishRequest.contentId, { 
          isPublic: true,
          status: 'published'
        });
        
        // Also update the underlying content (Course/Book/TestSeries/FreeResource)
        if (resource.courseId) {
          await Course.findByIdAndUpdate(resource.courseId, { publishStatus: 'published', isPublished: true });
        }
        if (resource.bookId) {
          await Book.findByIdAndUpdate(resource.bookId, { publishStatus: 'published', isPublished: true });
        }
        if (resource.testSeriesId) {
          await TestSeries.findByIdAndUpdate(resource.testSeriesId, { publishStatus: 'published' });
        }
        if (resource.freeResourceId) {
          await FreeResource.findByIdAndUpdate(resource.freeResourceId, { publishStatus: 'published', isPublished: true });
        }
      }
    } else if (action === 'reject') {
      publishRequest.status = 'rejected';
      publishRequest.rejectionReason = rejectionReason || '';
      publishRequest.approvedBy = req.user._id;
      publishRequest.reviewDate = new Date();

      // Update content status
      if (publishRequest.contentType === 'course') {
        await Course.findByIdAndUpdate(publishRequest.contentId, { publishStatus: 'rejected', publishNotes: rejectionReason });
      } else if (publishRequest.contentType === 'testSeries') {
        if (mongoose.Types.ObjectId.isValid(String(publishRequest.contentId))) {
          await TestSeries.findByIdAndUpdate(publishRequest.contentId, { publishStatus: 'rejected' });
        } else {
          const seriesType = String(publishRequest.contentId || '').toUpperCase();
          if (['S1','S2','S3','S4'].includes(seriesType)) {
            await TestSeries.findOneAndUpdate({ seriesType }, { publishStatus: 'rejected' });
          }
        }
      } else if (publishRequest.contentType === 'resource') {
        const resource = await Resource.findById(publishRequest.contentId);
        await Resource.findByIdAndUpdate(publishRequest.contentId, { 
          status: 'rejected',
          adminComment: rejectionReason
        });
        
        // Also update the underlying content
        if (resource.courseId) {
          await Course.findByIdAndUpdate(resource.courseId, { publishStatus: 'rejected', publishNotes: rejectionReason });
        }
        if (resource.bookId) {
          await Book.findByIdAndUpdate(resource.bookId, { publishStatus: 'rejected', publishNotes: rejectionReason });
        }
        if (resource.testSeriesId) {
          await TestSeries.findByIdAndUpdate(resource.testSeriesId, { publishStatus: 'rejected' });
        }
        if (resource.freeResourceId) {
          await FreeResource.findByIdAndUpdate(resource.freeResourceId, { publishStatus: 'rejected' });
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const updatedRequest = await publishRequest.save();
    const populatedRequest = await PublishRequest.findById(updatedRequest._id)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name');

    res.json(populatedRequest);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Publish request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete publish request
// @route   DELETE /api/publish-requests/:id
// @access  Private
export const deletePublishRequest = async (req, res) => {
  try {
    const publishRequest = await PublishRequest.findById(req.params.id);
    if (!publishRequest) {
      return res.status(404).json({ message: 'Publish request not found' });
    }

    // Only requester or admin can delete
    if (publishRequest.requestedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await publishRequest.deleteOne();
    res.json({ message: 'Publish request deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Publish request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
