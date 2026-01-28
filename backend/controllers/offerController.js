import Offer from '../models/Offer.js';
import { validationResult } from 'express-validator';

// @desc    Get all active offers (public)
// @route   GET /api/offers
// @access  Public
export const getOffers = async (req, res) => {
  try {
    const now = new Date();
    console.log('Current date:', now);
    
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('applicableCourses', 'title price')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    console.log('Found offers:', offers.length);
    res.json({ offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all offers (admin only)
// @route   GET /api/offers/admin/all
// @access  Private/Admin
export const getAllOffersAdmin = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('applicableCourses', 'title price')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ offers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get offer by ID
// @route   GET /api/offers/:id
// @access  Public
export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('applicableCourses', 'title price')
      .populate('createdBy', 'name');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json(offer);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create offer (admin only)
// @route   POST /api/offers
// @access  Private/Admin
export const createOffer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, discountType, discountValue, applicableCourses, startDate, endDate, maxUsageCount, code } = req.body;

    const offer = await Offer.create({
      title,
      description,
      discountType: discountType || 'percentage',
      discountValue,
      applicableCourses: applicableCourses || [],
      startDate,
      endDate,
      maxUsageCount: maxUsageCount || null,
      code,
      createdBy: req.user._id,
    });

    const populatedOffer = await Offer.findById(offer._id)
      .populate('applicableCourses', 'title price')
      .populate('createdBy', 'name');

    res.status(201).json(populatedOffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update offer (admin only)
// @route   PUT /api/offers/:id
// @access  Private/Admin
export const updateOffer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const { title, description, discountType, discountValue, applicableCourses, startDate, endDate, maxUsageCount, code, isActive } = req.body;

    if (title) offer.title = title;
    if (description) offer.description = description;
    if (discountType) offer.discountType = discountType;
    if (discountValue !== undefined) offer.discountValue = discountValue;
    if (applicableCourses) offer.applicableCourses = applicableCourses;
    if (startDate) offer.startDate = startDate;
    if (endDate) offer.endDate = endDate;
    if (maxUsageCount !== undefined) offer.maxUsageCount = maxUsageCount;
    if (code) offer.code = code;
    if (isActive !== undefined) offer.isActive = isActive;

    const updatedOffer = await offer.save();
    const populatedOffer = await Offer.findById(updatedOffer._id)
      .populate('applicableCourses', 'title price')
      .populate('createdBy', 'name');

    res.json(populatedOffer);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete offer (admin only)
// @route   DELETE /api/offers/:id
// @access  Private/Admin
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    await offer.deleteOne();
    res.json({ message: 'Offer deleted' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Validate coupon code
// @route   POST /api/offers/validate-coupon
// @access  Public
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const now = new Date();
    const offer = await Offer.findOne({
      code,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!offer) {
      return res.status(404).json({ message: 'Invalid or expired coupon code' });
    }

    if (offer.maxUsageCount && offer.currentUsageCount >= offer.maxUsageCount) {
      return res.status(400).json({ message: 'Coupon code has reached its usage limit' });
    }

    res.json({ valid: true, offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
