import Cart from '../models/Cart.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// Get current user's cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.json({ items: [] });

    // Fetch all paid enrollments for the user
    const enrollments = await Enrollment.find({
      userId: req.user._id,
      paymentStatus: 'paid'
    });

    // Create sets of enrolled item IDs per type
    const enrolledCourses = new Set(
      enrollments.filter(e => e.courseId).map(e => e.courseId.toString())
    );
    const enrolledBooks = new Set(
      enrollments.filter(e => e.bookId).map(e => e.bookId.toString())
    );
    const enrolledTestSeries = new Set(
      enrollments.filter(e => e.testSeriesId).map(e => e.testSeriesId.toString())
    );

    // Filter out already purchased items
    const filteredItems = cart.items.filter(item => {
      const itemIdStr = item.itemId.toString();
      if (item.itemType === 'course') {
        return !enrolledCourses.has(itemIdStr);
      } else if (item.itemType === 'book') {
        return !enrolledBooks.has(itemIdStr);
      } else if (item.itemType === 'testseries') {
        return !enrolledTestSeries.has(itemIdStr);
      }
      return true; // Keep unknown types
    });

    // Update cart in DB if items were filtered out
    if (filteredItems.length !== cart.items.length) {
      cart.items = filteredItems;
      await cart.save();
    }

    res.json({ items: filteredItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { courseId, bookId, testSeriesId, qty = 1 } = req.body;

    // Determine item type and ID
    let itemType, itemId, itemModel, itemTitle, itemPrice;

    if (courseId) {
      itemType = 'course';
      itemId = courseId;
      itemModel = Course;
    } else if (bookId) {
      itemType = 'book';
      itemId = bookId;
      itemModel = require('../models/Book.js').default;
    } else if (testSeriesId) {
      itemType = 'testseries';
      itemId = testSeriesId;
      itemModel = require('../models/TestSeries.js').default;
    } else {
      return res.status(400).json({ message: 'courseId, bookId, or testSeriesId is required' });
    }

    // Prevent admin/subadmin from using cart
    if (req.user && (req.user.role === 'admin' || req.user.role === 'subadmin')) {
      return res.status(403).json({ message: 'Admins and sub-admins cannot use cart' });
    }

    const item = await itemModel.findById(itemId);
    if (!item) return res.status(404).json({ message: `${itemType} not found` });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existing = cart.items.find(i => i.itemId.toString() === itemId.toString() && i.itemType === itemType);
    if (existing) {
      existing.qty = existing.qty + qty;
    } else {
      cart.items.push({
        itemType,
        itemId: item._id,
        title: item.title,
        thumbnail: item.thumbnail,
        price: item.price || 0,
        qty
      });
    }

    await cart.save();
    res.status(200).json({ items: cart.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ message: 'itemId required' });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(i => i.itemId.toString() !== itemId.toString());
    await cart.save();
    res.json({ items: cart.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
