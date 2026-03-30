import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import TestSeries from '../models/TestSeries.js';
import Book from '../models/Book.js';
import { validationResult } from 'express-validator';
import { validatePhone } from '../utils/validatePhone.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const SERIES_TYPE_LABELS = {
  S1: 'Full Syllabus',
  S2: '50% Syllabus',
  S3: '30% Syllabus',
  S4: 'CA Successful Specials',
  'inter-s1': 'Full Syllabus (Inter)',
  'inter-s2': '50% Syllabus (Inter)',
  'inter-s3': 'Chapterwise (Inter)',
  'inter-s4': 'CA Successful Specials (Inter)',
  s1: 'Full Syllabus',
  s2: '50% Syllabus',
  s3: '30% Syllabus',
  s4: 'CA Successful Specials',
};

const MENTORSHIP_PLAN_TITLES = {
  mentorship_basic_01: 'Basic Mentorship Plan',
  mentorship_golden_02: 'Golden Mentorship Plan',
  mentorship_platinum_03: 'Platinum Mentorship Plan',
};

const ATTEMPT_OPTIONS = ['May 26', 'Sept 26', 'Jan 26'];
const LEVEL_OPTIONS = ['CA Inter', 'CA Final'];
const PREPARING_FOR_OPTIONS = ['Group 1', 'Group 2', 'Both Groups'];

const SUBJECT_LABELS = {
  fr: 'FR',
  afm: 'AFM',
  audit: 'Audit',
  dt: 'DT',
  idt: 'IDT',
  aa: 'AA',
  cl: 'CL',
  tx: 'TX',
  taxation: 'Taxation',
  costing: 'Costing',
  fmsm: 'FM SM',
  fmsmtheory: 'FM SM',
  advaccounting: 'Advanced Accounting',
  advanceaccounting: 'Advanced Accounting',
  corporatelaw: 'Corporate Law',
};

const toTitleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const normalizeSubjectLabel = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const compact = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (SUBJECT_LABELS[compact]) return SUBJECT_LABELS[compact];

  return toTitleCase(raw);
};

const parseKnownSeriesLabel = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const compact = raw.toLowerCase().replace(/\s+/g, '');

  let match = compact.match(/^series(\d+)$/);
  if (match) return `Series ${Number(match[1])}`;

  // Handles short forms like i1/s1 used in some legacy data
  match = compact.match(/^[is](\d+)$/);
  if (match) return `Series ${Number(match[1])}`;

  match = compact.match(/^group(\d+)$/);
  if (match) return `Group ${Number(match[1])}`;

  match = compact.match(/^g(\d+)$/);
  if (match) return `Group ${Number(match[1])}`;

  return null;
};

const compareSeriesLabel = (a, b) => {
  const seriesA = String(a || '').match(/^Series\s+(\d+)$/i);
  const seriesB = String(b || '').match(/^Series\s+(\d+)$/i);
  if (seriesA && seriesB) return Number(seriesA[1]) - Number(seriesB[1]);
  if (seriesA) return -1;
  if (seriesB) return 1;

  const groupA = String(a || '').match(/^Group\s+(\d+)$/i);
  const groupB = String(b || '').match(/^Group\s+(\d+)$/i);
  if (groupA && groupB) return Number(groupA[1]) - Number(groupB[1]);
  if (groupA) return -1;
  if (groupB) return 1;

  return String(a || '').localeCompare(String(b || ''));
};

const buildSeriesSubjectSummary = (entries = []) => {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  return entries
    .sort((a, b) => compareSeriesLabel(a.series, b.series))
    .map((entry) => `${entry.series}: ${entry.subjects.join(', ')}`)
    .join('; ');
};

const extractTestSeriesSelection = (subjects = []) => {
  if (!Array.isArray(subjects)) return { subjects: [], seriesDetails: [] };

  const subjectSeen = new Set();
  const plainSubjects = [];
  const seriesMap = new Map();

  const addSubject = (seriesLabel, rawSubject) => {
    const normalizedSubject = normalizeSubjectLabel(rawSubject);
    if (!normalizedSubject) return;

    const subjectKey = normalizedSubject.toLowerCase().replace(/\s+/g, '');
    if (!subjectSeen.has(subjectKey)) {
      subjectSeen.add(subjectKey);
      plainSubjects.push(normalizedSubject);
    }

    if (!seriesLabel) return;

    const mapKey = seriesLabel.toLowerCase();
    if (!seriesMap.has(mapKey)) {
      seriesMap.set(mapKey, {
        series: seriesLabel,
        subjects: [],
        seen: new Set(),
      });
    }

    const bucket = seriesMap.get(mapKey);
    if (!bucket.seen.has(subjectKey)) {
      bucket.seen.add(subjectKey);
      bucket.subjects.push(normalizedSubject);
    }
  };

  for (const rawItem of subjects) {
    if (!rawItem) continue;
    const value = String(rawItem).trim();
    if (!value) continue;

    // Handles legacy format like: i1 (AA, CL, TX)
    const groupedMatch = value.match(/^([^()]+)\(([^)]+)\)$/);
    if (groupedMatch) {
      const seriesToken = groupedMatch[1].trim();
      const seriesLabel = parseKnownSeriesLabel(seriesToken) || toTitleCase(seriesToken);
      const groupedSubjects = groupedMatch[2].split(',').map((part) => part.trim()).filter(Boolean);
      groupedSubjects.forEach((subject) => addSubject(seriesLabel, subject));
      continue;
    }

    let seriesLabel = null;
    let subjectToken = value;

    if (value.includes('-')) {
      const [prefix, ...rest] = value.split('-').map((part) => part.trim()).filter(Boolean);
      const parsedSeries = parseKnownSeriesLabel(prefix);
      if (parsedSeries && rest.length > 0) {
        seriesLabel = parsedSeries;
        subjectToken = rest.join('-');
      }
    }

    addSubject(seriesLabel, subjectToken);
  }

  const seriesDetails = Array.from(seriesMap.values()).map((item) => ({
    series: item.series,
    subjects: item.subjects,
  }));

  return { subjects: plainSubjects, seriesDetails };
};

const extractMentorshipPaperDetails = (papers = []) => {
  if (!Array.isArray(papers)) return [];

  const seriesMap = new Map();

  const addPaper = (seriesLabel, subjectToken) => {
    const normalizedSubject = normalizeSubjectLabel(subjectToken);
    if (!normalizedSubject) return;

    const finalSeries = seriesLabel || 'Selected Papers';
    const mapKey = finalSeries.toLowerCase();
    if (!seriesMap.has(mapKey)) {
      seriesMap.set(mapKey, { series: finalSeries, subjects: [], seen: new Set() });
    }

    const bucket = seriesMap.get(mapKey);
    const subjectKey = normalizedSubject.toLowerCase().replace(/\s+/g, '');
    if (!bucket.seen.has(subjectKey)) {
      bucket.seen.add(subjectKey);
      bucket.subjects.push(normalizedSubject);
    }
  };

  for (const rawPaper of papers) {
    if (!rawPaper) continue;
    const paperId = String(rawPaper).trim();
    if (!paperId) continue;

    const matchSeries = paperId.match(/series(\d+)/i);
    const seriesLabel = matchSeries ? `Series ${Number(matchSeries[1])}` : null;

    const parts = paperId.split(/[_-]/).map((part) => part.trim()).filter(Boolean);
    const subjectToken = parts[parts.length - 1] || '';

    addPaper(seriesLabel, subjectToken);
  }

  return Array.from(seriesMap.values()).map((item) => ({
    series: item.series,
    subjects: item.subjects,
  }));
};

const resolveSeriesDisplayName = (seriesDoc, fallbackIdOrName) => {
  if (seriesDoc?.seriesTypeLabel) return seriesDoc.seriesTypeLabel;
  if (seriesDoc?.seriesType && SERIES_TYPE_LABELS[seriesDoc.seriesType]) {
    return SERIES_TYPE_LABELS[seriesDoc.seriesType];
  }
  if (seriesDoc?.title) return seriesDoc.title;

  const fallback = String(fallbackIdOrName || '').trim();
  if (!fallback) return 'Test Series';
  return SERIES_TYPE_LABELS[fallback] || fallback;
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin

// @desc    Create new user (Admin)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate phone number if provided
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.message });
      }
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      phone,
      isVerified: true, // Admin-created users are automatically verified
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    // Get all paid enrollments for each user and build readable names
    const usersWithEnrollmentStatus = await Promise.all(
      users.map(async (user) => {
        const paidEnrollments = await Enrollment.find({ userId: user._id, paymentStatus: 'paid' }).sort({ enrollmentDate: -1 });

        const enrollmentList = [];

        for (const en of paidEnrollments) {
          try {
            if (en.courseId) {
              const c = await Course.findById(en.courseId).select('title');
              enrollmentList.push({ type: 'course', name: c ? c.title : String(en.courseId) });
            } else if (en.bookId) {
              const b = await Book.findById(en.bookId).select('title');
              enrollmentList.push({ type: 'book', name: b ? b.title : String(en.bookId) });
            } else if (en.testSeriesId) {
              // testSeriesId may be ObjectId or shorthand string
              let tsName = String(en.testSeriesId);
              let tsDoc = null;
              try {
                if (typeof en.testSeriesId === 'object' && en.testSeriesId._id) {
                  tsDoc = await TestSeries.findById(en.testSeriesId._id).select('title seriesType seriesTypeLabel');
                } else if (typeof en.testSeriesId === 'string') {
                  try { tsDoc = await TestSeries.findById(en.testSeriesId).select('title seriesTypeLabel seriesType'); } catch(_) { tsDoc = null; }
                  if (!tsDoc) {
                    try { tsDoc = await TestSeries.findOne({ seriesType: en.testSeriesId }).select('title seriesTypeLabel seriesType'); } catch(_) { tsDoc = null; }
                  }
                }
              } catch (e) {
                /* fallback to string id */
              }
              tsName = resolveSeriesDisplayName(tsDoc, en.testSeriesId);

              const selection = extractTestSeriesSelection(en.purchasedSubjects);
              const seriesSummary = buildSeriesSubjectSummary(selection.seriesDetails);
              const seriesWithSubjects = seriesSummary
                ? `${tsName} (${seriesSummary})`
                : (selection.subjects.length > 0 ? `${tsName} (${selection.subjects.join(', ')})` : tsName);

              enrollmentList.push({
                type: 'testseries',
                name: seriesWithSubjects,
                baseName: tsName,
                subjects: selection.subjects,
                seriesDetails: selection.seriesDetails,
              });
            } else if (en.mentorshipId) {
              const planName = MENTORSHIP_PLAN_TITLES[en.mentorshipId] || String(en.mentorshipId);
              const mentorshipDetails = extractMentorshipPaperDetails(en.mentorshipPapers);
              const mentorshipSummary = buildSeriesSubjectSummary(mentorshipDetails);
              const mentorshipWithDetails = mentorshipSummary
                ? `${planName} (${mentorshipSummary})`
                : planName;

              enrollmentList.push({
                type: 'mentorship',
                name: mentorshipWithDetails,
                baseName: planName,
                seriesDetails: mentorshipDetails,
              });
            }
          } catch (err) {
            console.warn('Error resolving enrollment name for user', user._id, err);
          }
        }

        const enrollmentNames = enrollmentList.map(e => e.name).join(', ');
        const enrollmentDetails = enrollmentList.map(e => e.name);

        return {
          ...user.toObject(),
          isEnrolled: enrollmentList.length > 0,
          enrollmentList,
          enrollmentNames,
          enrollmentDetails,
        };
      })
    );

    res.json({
      users: usersWithEnrollmentStatus,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, isActive, phone } = req.body;

    // Validate phone number if provided
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.message });
      }
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();

    res.json({ message: 'User removed' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile (for users to update their own profile)
// @route   PUT /api/users/profile/update
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone, dateOfBirth, address, attempt, level, preparingFor } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields (not email or password)
    if (name) user.name = name;
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.message });
      }
      user.phone = phone;
    }
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    if (attempt !== undefined) {
      if (attempt === '') {
        user.attempt = undefined;
      } else if (!ATTEMPT_OPTIONS.includes(attempt)) {
        return res.status(400).json({ message: 'Invalid attempt selected' });
      } else {
        user.attempt = attempt;
      }
    }

    if (level !== undefined) {
      if (level === '') {
        user.level = undefined;
      } else if (!LEVEL_OPTIONS.includes(level)) {
        return res.status(400).json({ message: 'Invalid level selected' });
      } else {
        user.level = level;
      }
    }

    if (preparingFor !== undefined) {
      if (preparingFor === '') {
        user.preparingFor = undefined;
      } else if (!PREPARING_FOR_OPTIONS.includes(preparingFor)) {
        return res.status(400).json({ message: 'Invalid preparing-for option selected' });
      } else {
        user.preparingFor = preparingFor;
      }
    }

    if (address) {
      user.address = {
        street: address.street || user.address?.street,
        city: address.city || user.address?.city,
        state: address.state || user.address?.state,
        country: address.country || user.address?.country,
        postalCode: address.postalCode || user.address?.postalCode,
      };
    }

    const updatedUser = await user.save();

    // Update localStorage with new user data
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      dateOfBirth: updatedUser.dateOfBirth,
      attempt: updatedUser.attempt,
      level: updatedUser.level,
      preparingFor: updatedUser.preparingFor,
      address: updatedUser.address,
      role: updatedUser.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change password (for users to update their own password)
// @route   PUT /api/users/profile/change-password
// @access  Private
export const changeUserPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send OTP to phone for verification
// @route   POST /api/users/phone/send-otp
// @access  Private
export const sendPhoneOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiry (10 minutes)
    user.phoneOTP = otp;
    user.phoneOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // TODO: Send OTP via SMS service (Twilio, etc)
    // For now, we'll return OTP in development mode
    res.json({
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify phone OTP
// @route   POST /api/users/phone/verify-otp
// @access  Private
export const verifyPhoneOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP is valid and not expired
    if (user.phoneOTP !== otp || !user.phoneOTPExpiry || new Date() > user.phoneOTPExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update phone and mark as verified
    user.phone = phone;
    user.phoneVerified = true;
    user.phoneOTP = null;
    user.phoneOTPExpiry = null;
    await user.save();

    res.json({
      message: 'Phone verified successfully',
      phone: user.phone,
      phoneVerified: user.phoneVerified,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Configure multer for profile picture uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const uploadProfilePicture = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// @desc    Upload profile picture
// @route   POST /api/users/profile/upload-picture
// @access  Private
export const uploadUserProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldPath = path.join(__dirname, '../uploads/profile-pictures', path.basename(user.profilePicture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new profile picture path
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicture = profilePictureUrl;
    await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove profile picture
// @route   DELETE /api/users/profile/remove-picture
// @access  Private
export const removeUserProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete profile picture file if exists
    if (user.profilePicture) {
      const filePath = path.join(__dirname, '../uploads/profile-pictures', path.basename(user.profilePicture));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove profile picture from user
    user.profilePicture = null;
    await user.save();

    res.json({
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
