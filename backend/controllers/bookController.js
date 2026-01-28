import Book from '../models/Book.js';
import { validationResult } from 'express-validator';

// @desc    Get all published books (public view)
// @route   GET /api/books
// @access  Public
export const getBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category, search } = req.query;

    const query = { 
      isActive: true, 
      publishStatus: 'published',
      isPublished: true 
    };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const books = await Book.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Book.countDocuments(query);

    res.json({
      books,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get books by category
// @route   GET /api/books/category/:categoryId
// @access  Public
export const getBooksByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { categoryId } = req.params;

    const query = { 
      isActive: true, 
      publishStatus: 'published',
      isPublished: true,
      category: categoryId 
    };

    const books = await Book.find(query)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Book.countDocuments(query);

    res.json({
      books,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get book by ID
// @route   GET /api/books/:id
// @access  Public
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'name email');

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if user has access (authenticated user or published book)
    if (!book.isActive || book.publishStatus !== 'published' || !book.isPublished) {
      if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== book.createdBy._id.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(book);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
