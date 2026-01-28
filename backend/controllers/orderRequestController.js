import OrderRequest from '../models/OrderRequest.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// Create order/request (user requests access)
export const createOrderRequest = async (req, res) => {
  try {
    const { courseId, amount, message } = req.body;
    if (!courseId) return res.status(400).json({ message: 'courseId is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const existing = await OrderRequest.findOne({ userId: req.user._id, courseId, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending request for this course' });

    const order = await OrderRequest.create({ userId: req.user._id, courseId, amount: amount || course.price || 0, message: message || '' });
    res.status(201).json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list requests
export const listOrderRequests = async (req, res) => {
  try {
    const requests = await OrderRequest.find().populate('userId', 'name email').populate('courseId','title');
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: approve or reject
export const resolveOrderRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminComment } = req.body; // action: approve|reject
    const request = await OrderRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (action === 'approve') {
      request.status = 'approved';
      request.adminComment = adminComment || '';
      request.resolvedBy = req.user._id;
      await request.save();

      // Create enrollment if not exists
      const existingEnroll = await Enrollment.findOne({ userId: request.userId, courseId: request.courseId });
      if (!existingEnroll) {
        await Enrollment.create({ userId: request.userId, courseId: request.courseId, amount: request.amount || 0, paymentStatus: 'paid', transactionDate: new Date() });
      } else {
        existingEnroll.paymentStatus = 'paid';
        existingEnroll.transactionDate = new Date();
        await existingEnroll.save();
      }

      return res.json({ message: 'Request approved' });
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.adminComment = adminComment || '';
      request.resolvedBy = req.user._id;
      await request.save();
      return res.json({ message: 'Request rejected' });
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: list own requests
export const listUserRequests = async (req, res) => {
  try {
    const requests = await OrderRequest.find({ userId: req.user._id }).populate('courseId','title');
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
