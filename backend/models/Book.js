import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a book title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a book description'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide a category'],
    },
    author: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String, // URL from Appwrite
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    fileUrl: {
      type: String, // PDF/Book file URL from Appwrite
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileId: {
      type: String,
      trim: true,
    },
    pages: {
      type: Number, // Number of pages
      default: 0,
    },
    edition: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishStatus: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
    },
    publishNotes: String, // Admin notes on rejection/approval
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Book = mongoose.model('Book', bookSchema);

export default Book;
