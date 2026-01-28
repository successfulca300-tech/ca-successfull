import User from '../models/User.js';
import Course from '../models/Course.js';
import Resource from '../models/Resource.js';
import Offer from '../models/Offer.js';
import Enrollment from '../models/Enrollment.js';
import PublishRequest from '../models/PublishRequest.js';
import Testimonial from '../models/Testimonial.js';
import TestSeries from '../models/TestSeries.js';

// @desc    Get admin dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Count totals
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalResources = await Resource.countDocuments({ isActive: true });
    const totalCourses = await Course.countDocuments({ isActive: true, publishStatus: 'published' });
    const totalTestSeries = await TestSeries.countDocuments({ isActive: true, publishStatus: 'published' });

    // Active offers (not expired)
    const now = new Date();
    const activeOffers = await Offer.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // Pending requests (publish + testimonials + contact submissions)
    const pendingPublishRequests = await PublishRequest.countDocuments({ status: 'pending' });
    const pendingTestimonials = await Testimonial.countDocuments({ status: 'pending' });

    // Total enrolled users (unique users with paid enrollments)
    const totalEnrolledUsers = await Enrollment.distinct('userId', { paymentStatus: 'paid' }).then(users => users.length);

    // Total revenue (sum of amounts from paid enrollments)
    const revenueResult = await Enrollment.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Recent enrollments (last 10 days)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const recentEnrollments = await Enrollment.find({
      enrollmentDate: { $gte: tenDaysAgo },
      paymentStatus: 'paid',
    })
      .populate('userId', 'name')
      .populate('courseId', 'title')
      .populate('testSeriesId', 'title')
      .populate('bookId', 'title')
      .sort({ enrollmentDate: -1 })
      .limit(10);

    // Pending actions
    const pendingActions = [
      { label: `${pendingPublishRequests} publish requests awaiting approval`, count: pendingPublishRequests },
      { label: `${pendingTestimonials} testimonials pending review`, count: pendingTestimonials },
    ];

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
          const testSeries = await TestSeries.findById(r.contentId).select('title');
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
