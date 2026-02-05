import User from '../models/User.js';
import Course from '../models/Course.js';
import Resource from '../models/Resource.js';
import Offer from '../models/Offer.js';
import Enrollment from '../models/Enrollment.js';
import PublishRequest from '../models/PublishRequest.js';
import Testimonial from '../models/Testimonial.js';
import TestSeries from '../models/TestSeries.js';
import mongoose from 'mongoose';

// @desc    Get admin dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Sanitize any legacy shorthand references (e.g., 's1') in PublishRequest and Resource documents so
    // subsequent TestSeries queries do not attempt to cast shorthand strings to ObjectId and fail.
    try {
      console.log('[Dashboard] Scanning for shorthand contentId/testSeriesId references');
      const prs = await PublishRequest.find({ contentType: 'testSeries' });
      for (const pr of prs) {
        if (typeof pr.contentId === 'string') {
          const seriesType = String(pr.contentId || '').toUpperCase();
          if (/^S[1-4]$/.test(seriesType)) {
            const ts = await TestSeries.findOne({ seriesType });
            if (ts) {
              pr.contentId = ts._id;
              await pr.save();
              console.log(`[Dashboard] Migrated PublishRequest ${pr._id} contentId ${seriesType} -> ${ts._id}`);
            } else {
              console.warn(`[Dashboard] No TestSeries found for shorthand ${seriesType} referenced by PublishRequest ${pr._id}`);
            }
          }
        }
      }

      const resources = await Resource.find({ testSeriesId: { $exists: true } });
      for (const r of resources) {
        if (typeof r.testSeriesId === 'string') {
          const seriesType = String(r.testSeriesId || '').toUpperCase();
          if (/^S[1-4]$/.test(seriesType)) {
            const ts = await TestSeries.findOne({ seriesType });
            if (ts) {
              r.testSeriesId = ts._id;
              await r.save();
              console.log(`[Dashboard] Migrated Resource ${r._id} testSeriesId ${seriesType} -> ${ts._id}`);
            } else {
              console.warn(`[Dashboard] No TestSeries found for shorthand ${seriesType} referenced by Resource ${r._id}`);
            }
          }
        }
      }
    } catch (sanErr) {
      console.warn('[Dashboard] Sanitization of shorthand IDs failed:', sanErr.message);
    }

    // Count totals (with diagnostic logging)
    console.log('[Dashboard] Fetching totalUsers');
    let totalUsers;
    try { totalUsers = await User.countDocuments({ role: 'user' }); console.log('[Dashboard] totalUsers:', totalUsers); } catch (err) { console.error('[Dashboard] Error counting users:', err); throw err; }

    console.log('[Dashboard] Fetching totalResources');
    let totalResources;
    try { totalResources = await Resource.countDocuments({ isActive: true }); console.log('[Dashboard] totalResources:', totalResources); } catch (err) { console.error('[Dashboard] Error counting resources:', err); throw err; }

    console.log('[Dashboard] Fetching totalCourses');
    let totalCourses;
    try { totalCourses = await Course.countDocuments({ isActive: true, publishStatus: 'published' }); console.log('[Dashboard] totalCourses:', totalCourses); } catch (err) { console.error('[Dashboard] Error counting courses:', err); throw err; }

    console.log('[Dashboard] Fetching totalTestSeries');
    let totalTestSeries;
    try { totalTestSeries = await TestSeries.countDocuments({ isActive: true, publishStatus: 'published' }); console.log('[Dashboard] totalTestSeries:', totalTestSeries); } catch (err) { console.error('[Dashboard] Error counting test series:', err); throw err; }

    // Active offers (not expired)
    const now = new Date();
    console.log('[Dashboard] Fetching activeOffers');
    let activeOffers;
    try { activeOffers = await Offer.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }); console.log('[Dashboard] activeOffers:', activeOffers); } catch (err) { console.error('[Dashboard] Error counting offers:', err); throw err; }

    // Pending requests (publish + testimonials + contact submissions)
    console.log('[Dashboard] Fetching pendingPublishRequests');
    let pendingPublishRequests;
    try { pendingPublishRequests = await PublishRequest.countDocuments({ status: 'pending' }); console.log('[Dashboard] pendingPublishRequests:', pendingPublishRequests); } catch (err) { console.error('[Dashboard] Error counting publish requests:', err); throw err; }

    console.log('[Dashboard] Fetching pendingTestimonials');
    let pendingTestimonials;
    try { pendingTestimonials = await Testimonial.countDocuments({ status: 'pending' }); console.log('[Dashboard] pendingTestimonials:', pendingTestimonials); } catch (err) { console.error('[Dashboard] Error counting testimonials:', err); throw err; }

    // Total enrolled users (unique users with paid enrollments)
    console.log('[Dashboard] Fetching totalEnrolledUsers');
    let totalEnrolledUsers;
    try { totalEnrolledUsers = await Enrollment.distinct('userId', { paymentStatus: 'paid' }).then(users => users.length); console.log('[Dashboard] totalEnrolledUsers:', totalEnrolledUsers); } catch (err) { console.error('[Dashboard] Error fetching distinct enrolled users:', err); throw err; }

    // Total revenue (sum of amounts from paid enrollments)
    console.log('[Dashboard] Calculating totalRevenue');
    let totalRevenue;
    try {
      const revenueResult = await Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
      console.log('[Dashboard] totalRevenue:', totalRevenue);
    } catch (err) { console.error('[Dashboard] Error calculating revenue:', err); throw err; }

    // Recent enrollments (last 10 days)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    console.log('[Dashboard] Fetching recentEnrollments');
    let recentEnrollments;
    try {
      recentEnrollments = await Enrollment.find({
        enrollmentDate: { $gte: tenDaysAgo },
        paymentStatus: 'paid',
      })
        .populate('userId', 'name')
        .populate('courseId', 'title')
        // NOTE: don't use default populate for testSeriesId because some enrollments
        // may store a shorthand string like 's1' which would cause Mongoose to
        // attempt to cast 's1' to ObjectId and throw. We'll manually populate below.
        .populate('bookId', 'title')
        .sort({ enrollmentDate: -1 })
        .limit(10);
      console.log('[Dashboard] recentEnrollments count:', recentEnrollments.length);
    } catch (err) { console.error('[Dashboard] Error fetching recent enrollments:', err); throw err; }

    // Pending actions
    const pendingActions = [
      { label: `${pendingPublishRequests} publish requests awaiting approval`, count: pendingPublishRequests },
      { label: `${pendingTestimonials} testimonials pending review`, count: pendingTestimonials },
    ];

    // Manually populate testSeriesId where required to avoid ObjectId cast errors
    for (let i = 0; i < recentEnrollments.length; i++) {
      const e = recentEnrollments[i];
      if (e.testSeriesId) {
        try {
          if (mongoose.Types.ObjectId.isValid(String(e.testSeriesId))) {
            const ts = await TestSeries.findById(e.testSeriesId).select('title');
            if (ts) e.testSeriesId = ts;
          } else {
            const seriesType = String(e.testSeriesId || '').toUpperCase();
            if (['S1','S2','S3','S4'].includes(seriesType)) {
              const ts = await TestSeries.findOne({ seriesType }).select('title');
              if (ts) e.testSeriesId = ts;
            }
          }
        } catch (err) {
          console.warn('Failed to populate testSeriesId for recent enrollment', e._id, err.message);
        }
      }
    }

    res.json({
      stats: {
        totalUsers,
        totalResources,
        totalCourses,
        totalTestSeries,
        activeOffers,
        pendingPublishRequests,
        pendingTestimonials,
        totalEnrolledUsers,
        totalRevenue,
      },
      recentEnrollments: recentEnrollments.map((e) => ({
        id: e._id,
        userName: e.userId?.name || 'Unknown User',
        courseTitle: e.courseId?.title || e.testSeriesId?.title || e.bookId?.title || 'Unknown Resource',
        enrollmentDate: e.enrollmentDate,
      })),
      pendingActions,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Get user enrollments (for recent enrollments section)
// @route   GET /api/dashboard/enrollments
// @access  Private/Admin
export const getRecentEnrollments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const enrollments = await Enrollment.find({ paymentStatus: 'paid' })
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .populate('testSeriesId', 'title')
      .populate('bookId', 'title')
      .sort({ enrollmentDate: -1 })
      .limit(limit);

    res.json({
      enrollments: enrollments.map((e) => ({
        id: e._id,
        userName: e.userId?.name || 'Unknown User',
        userEmail: e.userId?.email || '',
        courseTitle: e.courseId?.title || e.testSeriesId?.title || e.bookId?.title || 'Unknown Resource',
        enrollmentDate: e.enrollmentDate,
        paymentStatus: e.paymentStatus,
      })),
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Get pending publish requests (for admin actions)
// @route   GET /api/dashboard/pending-requests
// @access  Private/Admin
export const getPendingPublishRequests = async (req, res) => {
  try {
    // Temporarily fetch ALL requests to debug status values
    const requests = await PublishRequest.find({})
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`Found ${requests.length} total requests`);

    // Enrich with content details
    const enrichedRequests = await Promise.all(
      requests.map(async (r) => {
        let contentTitle = 'Unknown';
        let contentType = 'unknown';
        
        if (r.contentType === 'course') {
          const course = await Course.findById(r.contentId).select('title');
          contentTitle = course?.title || 'Unknown';
          contentType = 'Course';
        } else if (r.contentType === 'testSeries') {
          // contentId may be an ObjectId _id OR a shorthand seriesType like 's1'. Handle both.
          let testSeries = null;
          if (mongoose.Types.ObjectId.isValid(String(r.contentId))) {
            testSeries = await TestSeries.findById(r.contentId).select('title');
          } else {
            const seriesType = String(r.contentId || '').toUpperCase();
            if (['S1','S2','S3','S4'].includes(seriesType)) {
              testSeries = await TestSeries.findOne({ seriesType }).select('title');
            }
          }
          contentTitle = testSeries?.title || 'Unknown';
          contentType = 'Test Series';
        } else if (r.contentType === 'resource') {
          const resource = await Resource.findById(r.contentId).select('title type');
          contentTitle = resource?.title || 'Unknown';
          
          // Map resource type to display name
          const typeMap = {
            'document': 'PDF/Document',
            'video': 'Video',
            'link': 'Link',
            'file': 'File',
            'pdf': 'PDF',
            'book': 'Book',
            'notes': 'Notes',
            'test': 'Quiz/Test',
            'other': 'Other'
          };
          contentType = typeMap[resource?.type] || resource?.type || 'Resource';
        }
        
        console.log(`Processing request ${r._id}: status = ${r.status}, contentType = ${r.contentType}, contentId = ${r.contentId}`);
        return {
          id: r._id,
          _id: r._id,
          contentTitle: contentTitle || 'Unknown',
          contentType: contentType || 'Unknown',
          resourceType: r.contentType || 'unknown',
          requestedBy: {
            name: r.requestedBy?.name || 'Unknown',
            email: r.requestedBy?.email || ''
          },
          status: r.status || 'pending',
          createdAt: r.createdAt || new Date(),
        };
      })
    );

    // Filter to only pending requests for display, but log all
    const pendingRequests = enrichedRequests.filter(r => r.status === 'pending');
    console.log(`Returning ${pendingRequests.length} pending requests out of ${enrichedRequests.length} total`);
    console.log('Final pending requests:', pendingRequests);
    res.json({
      requests: pendingRequests,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Get pending testimonials (for moderation)
// @route   GET /api/dashboard/pending-testimonials
// @access  Private/Admin
export const getPendingTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: 'pending' })
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      testimonials: testimonials.map((t) => ({
        id: t._id,
        userName: t.userId?.name || 'Unknown User',
        courseTitle: t.courseId?.title || 'General',
        rating: t.rating || 0,
        comment: t.comment || '',
        createdAt: t.createdAt || new Date(),
      })),
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Get all users (for admin user management)
// @route   GET /api/dashboard/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { role, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// @desc    Update user role or status (admin)
// @route   PUT /api/dashboard/users/:id
// @access  Private/Admin
export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { role, isActive } = req.body;

    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    const updatedUser = await user.save();
    const { password, ...userWithoutPassword } = updatedUser.toObject();

    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard content overview (courses, offers, resources)
// @route   GET /api/dashboard/content-overview
// @access  Private/Admin
export const getContentOverview = async (req, res) => {
  try {
    const draftCourses = await Course.countDocuments({ publishStatus: 'draft' });
    const publishedCourses = await Course.countDocuments({ publishStatus: 'published' });
    const rejectedCourses = await Course.countDocuments({ publishStatus: 'rejected' });

    const draftTestSeries = await TestSeries.countDocuments({ publishStatus: 'draft' });
    const publishedTestSeries = await TestSeries.countDocuments({ publishStatus: 'published' });
    const rejectedTestSeries = await TestSeries.countDocuments({ publishStatus: 'rejected' });

    res.json({
      courses: { draft: draftCourses, published: publishedCourses, rejected: rejectedCourses },
      testSeries: { draft: draftTestSeries, published: publishedTestSeries, rejected: rejectedTestSeries },
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
