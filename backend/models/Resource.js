import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
    },
    resourceCategory: {
      // Type of resource: video, book, test/quiz, notes/pdf
      type: String,
      enum: ['video', 'book', 'test', 'notes'],
      required: [true, 'Please specify resource category'],
    },
    type: {
      type: String,
      enum: ['document', 'video', 'link', 'file', 'other'],
      default: 'other',
    },
    url: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    duration: {
      // duration in minutes (optional)
      type: Number,
      default: 0,
    },
    thumbnailFileId: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // References to specific collection documents
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
    },
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeries',
    },
    freeResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FreeResource',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
    },
    adminComment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;

