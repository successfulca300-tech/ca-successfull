import CopyRequest from '../models/CopyRequest.js';
import User from '../models/User.js';
import TestSeriesAnswer from '../models/TestSeriesAnswer.js';

// @desc    Teacher requests more copies
// @route   POST /api/copy-requests/request
// @access  Private/Teacher
export const requestMoreCopies = async (req, res) => {
  try {
    const { numberOfCopies, reason } = req.body;

    if (!numberOfCopies || numberOfCopies < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please specify number of copies needed',
      });
    }

    // Count existing requests for this teacher to set request number
    const existingRequests = await CopyRequest.countDocuments({
      teacherId: req.user._id,
    });

    const copyRequest = await CopyRequest.create({
      teacherId: req.user._id,
      numberOfCopies,
      reason: reason || '',
      requestNumber: existingRequests + 1,
    });

    // Update teacher profile stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'teacherProfile.totalCopiesRequested': numberOfCopies },
    });

    res.status(201).json({
      success: true,
      message: 'Copy request submitted successfully',
      request: copyRequest,
    });
  } catch (error) {
    console.error('Request copies error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to request copies',
    });
  }
};

// @desc    Get pending copy requests (SubAdmin)
// @route   GET /api/copy-requests/pending
// @access  Private/SubAdmin
export const getPendingCopyRequests = async (req, res) => {
  try {
    const requests = await CopyRequest.find({ status: 'pending' })
      .populate('teacherId', 'name email phone teacherProfile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Approve copy request (SubAdmin)
// @route   PUT /api/copy-requests/:requestId/approve
// @access  Private/SubAdmin
export const approveCopyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvalComment } = req.body;

    const copyRequest = await CopyRequest.findById(requestId).populate(
      'teacherId'
    );

    if (!copyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Copy request not found',
      });
    }

    if (copyRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending',
      });
    }

    copyRequest.status = 'approved';
    copyRequest.approvedBy = req.user._id;
    copyRequest.approvalDate = new Date();
    copyRequest.approvalComment = approvalComment || '';

    await copyRequest.save();

    // Update teacher stats
    await User.findByIdAndUpdate(copyRequest.teacherId._id, {
      $inc: { 'teacherProfile.totalCopiesApproved': copyRequest.numberOfCopies },
    });

    res.json({
      success: true,
      message: 'Copy request approved',
      request: copyRequest,
    });
  } catch (error) {
    console.error('Approve copy request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve request',
    });
  }
};

// @desc    Deny copy request (SubAdmin)
// @route   PUT /api/copy-requests/:requestId/deny
// @access  Private/SubAdmin
export const denyCopyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const copyRequest = await CopyRequest.findById(requestId);

    if (!copyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Copy request not found',
      });
    }

    if (copyRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending',
      });
    }

    copyRequest.status = 'denied';
    copyRequest.approvedBy = req.user._id;
    copyRequest.approvalDate = new Date();
    copyRequest.approvalComment = reason || 'Request denied';

    await copyRequest.save();

    res.json({
      success: true,
      message: 'Copy request denied',
      request: copyRequest,
    });
  } catch (error) {
    console.error('Deny copy request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deny request',
    });
  }
};

// @desc    Get teacher management data for admin
// @route   GET /api/copy-requests/admin/teachers-stats
// @access  Private/Admin
export const getTeacherManagementStats = async (req, res) => {
  try {
    // Get all teachers with their stats
    const teachers = await User.find({ role: 'teacher' })
      .select(
        'name email phone role teacherProfile createdAt'
      )
      .sort({ createdAt: -1 });

    // Enhance with copy request history
    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const teacher_obj = teacher.toObject();

        // Get total evaluated copies
        const evaluatedCount = await TestSeriesAnswer.countDocuments({
          evaluatedBy: teacher._id,
          isEvaluated: true,
        });

        // Get copy request history
        const copyRequests = await CopyRequest.find({
          teacherId: teacher._id,
        })
          .select('numberOfCopies status createdAt approvalDate')
          .sort({ createdAt: -1 });

        // Get assigned copies history
        const assignedAnswers = await TestSeriesAnswer.find({
          assignedToTeacher: teacher._id,
        })
          .populate('userId', 'name')
          .populate('paperId', 'subject')
          .select('userId paperId assignedAt evaluatedAt')
          .sort({ assignedAt: -1 })
          .limit(10);

        return {
          ...teacher_obj,
          totalEvaluatedCopies: evaluatedCount,
          copyRequestHistory: copyRequests,
          assignedCopiesHistory: assignedAnswers,
        };
      })
    );

    res.json({
      success: true,
      teachers: teachersWithStats,
      total: teachersWithStats.length,
    });
  } catch (error) {
    console.error('Get teacher management stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update teacher rating and feedback (Admin)
// @route   PUT /api/copy-requests/admin/teacher/:teacherId/rating
// @access  Private/Admin
export const updateTeacherRating = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { rating, feedback, warnings } = req.body;

    if (rating && (rating < 0 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0 and 5',
      });
    }

    const updateData = {};

    if (rating !== undefined) {
      updateData['teacherProfile.rating'] = rating;
    }

    if (feedback !== undefined) {
      updateData['teacherProfile.feedback'] = feedback;
      updateData['teacherProfile.feedbackUpdatedAt'] = new Date();
    }

    if (warnings && Array.isArray(warnings)) {
      updateData['teacherProfile.warnings'] = warnings.map((w) => ({
        type: w.type || 'general',
        message: w.message,
        issuedAt: new Date(),
      }));
    }

    const teacher = await User.findByIdAndUpdate(
      teacherId,
      updateData,
      { new: true }
    ).select('name email teacherProfile');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    res.json({
      success: true,
      message: 'Teacher rating and feedback updated',
      teacher,
    });
  } catch (error) {
    console.error('Update teacher rating error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update rating',
    });
  }
};

// @desc    Get teacher feedback and warnings (Teacher)
// @route   GET /api/copy-requests/teacher/feedback
// @access  Private/Teacher
export const getTeacherFeedback = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id).select(
      'name teacherProfile'
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    res.json({
      success: true,
      feedback: teacher.teacherProfile.feedback || null,
      feedbackUpdatedAt: teacher.teacherProfile.feedbackUpdatedAt,
      warnings: teacher.teacherProfile.warnings || [],
      rating: teacher.teacherProfile.rating,
      stats: {
        totalRequested: teacher.teacherProfile.totalCopiesRequested,
        totalApproved: teacher.teacherProfile.totalCopiesApproved,
        totalEvaluated: teacher.teacherProfile.totalCopiesEvaluated,
      },
    });
  } catch (error) {
    console.error('Get teacher feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get teacher's evaluation history (Admin - for teacher management)
// @route   GET /api/copy-requests/admin/teacher/:teacherId/evaluations
// @access  Private/Admin
export const getTeacherEvaluations = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Fetch all answer sheets assigned to and evaluated by this teacher
    const evaluations = await TestSeriesAnswer.find({
      assignedToTeacher: teacherId,
      isEvaluated: true,
    })
      .populate('userId', 'name email attempt level')
      .populate('paperId', 'subject group paperType')
      .populate('testSeriesId', 'name')
      .select(
        'userId paperId testSeriesId marksObtained maxMarks percentage evaluatorComments evaluatedAt'
      )
      .sort({ evaluatedAt: -1 });

    res.json({
      success: true,
      evaluations,
      total: evaluations.length,
    });
  } catch (error) {
    console.error('Get teacher evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation history',
    });
  }
};
