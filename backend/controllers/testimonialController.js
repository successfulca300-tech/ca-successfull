import Testimonial from '../models/Testimonial.js';
import { validationResult } from 'express-validator';

// @desc    Get published testimonials (public)
// @route   GET /api/testimonials
// @access  Public
export const getTestimonials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { courseId } = req.query;

    const query = { status: 'approved', isPublished: true };

    if (courseId) {
      query.courseId = courseId;
    }

    const testimonials = await Testimonial.find(query)
      .populate('userId', 'name')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);

    res.json({
      testimonials,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get testimonial by ID
// @route   GET /api/testimonials/:id
// @access  Public
export const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)
      .populate('userId', 'name')
      .populate('courseId', 'title');

    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    // Check if published or user is owner/admin
    if (!testimonial.isPublished || testimonial.status !== 'approved') {
      if (!req.user || (req.user._id.toString() !== testimonial.userId._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(testimonial);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create testimonial (user)
// @route   POST /api/testimonials
// @access  Private
export const createTestimonial = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment, courseId, userName } = req.body;

    const testimonial = await Testimonial.create({
      userId: req.user._id,
      userName: userName || null,
      courseId: courseId || null,
      rating,
      comment,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      isPublished: req.user.role === 'admin' ? true : false,
    });

    const populatedTestimonial = await Testimonial.findById(testimonial._id)
      .populate('userId', 'name');

    res.status(201).json(populatedTestimonial);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update testimonial (user - if not approved yet)
// @route   PUT /api/testimonials/:id
// @access  Private
export const updateTestimonial = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    // Check authorization
    if (testimonial.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cannot update if already approved
    if (testimonial.status === 'approved') {
      return res.status(400).json({ message: 'Cannot update approved testimonial' });
    }

    const { rating, comment, courseId } = req.body;

    if (rating) testimonial.rating = rating;
    if (comment) testimonial.comment = comment;
    if (courseId) testimonial.courseId = courseId;

    const updatedTestimonial = await testimonial.save();
    const populatedTestimonial = await Testimonial.findById(updatedTestimonial._id)
      .populate('userId', 'name');

    res.json(populatedTestimonial);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete testimonial (user or admin)
// @route   DELETE /api/testimonials/:id
// @access  Private
export const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    if (testimonial.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await testimonial.deleteOne();
    res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve/reject testimonial (admin)
// @route   PUT /api/testimonials/:id/moderate
// @access  Private/Admin
export const moderateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    const { action, rejectionReason } = req.body;

    if (action === 'approve') {
      testimonial.status = 'approved';
      testimonial.isPublished = true;
      testimonial.approvedBy = req.user._id;
      testimonial.approvedDate = new Date();
    } else if (action === 'reject') {
      testimonial.status = 'rejected';
      testimonial.rejectionReason = rejectionReason || '';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const updatedTestimonial = await testimonial.save();
    const populatedTestimonial = await Testimonial.findById(updatedTestimonial._id)
      .populate('userId', 'name')
      .populate('approvedBy', 'name');

    res.json(populatedTestimonial);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
