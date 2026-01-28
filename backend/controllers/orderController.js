import Order from '../models/Order.js';
import Cart from '../models/Cart.js';

// Create order from cart
export const createOrder = async (req, res) => {
  try {
    const { address, registrationNumber, examAttempt, coupon } = req.body;
    
    // Validate required fields
    if (!address || !address.street || !address.city || !address.state || !address.postalCode) {
      return res.status(400).json({ message: 'Complete address is required' });
    }
    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }
    if (!examAttempt) {
      return res.status(400).json({ message: 'Exam attempt is required' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.courseId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const items = cart.items.map(i => ({ 
      courseId: i.courseId._id || i.courseId, 
      title: i.title, 
      price: i.price, 
      qty: i.qty 
    }));
    
    const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    let discountAmount = 0;
    let total = subtotal;

    // Apply coupon discount if provided
    if (coupon && coupon.code) {
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
      } else if (coupon.discountType === 'fixed') {
        discountAmount = coupon.discountValue;
      }
      total = Math.max(0, subtotal - discountAmount);
    }

    const order = await Order.create({ 
      user: req.user._id, 
      items, 
      subtotal,
      discountAmount,
      coupon: coupon ? {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      } : null,
      total, 
      status: 'pending', 
      paymentStatus: 'pending', 
      trackingId: `ORD${Date.now().toString().slice(-6)}`,
      address,
      registrationNumber,
      examAttempt,
    });

    // Clear cart after successful order
    await Cart.findOneAndDelete({ user: req.user._id });

    res.status(201).json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order by id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // ensure owner
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
