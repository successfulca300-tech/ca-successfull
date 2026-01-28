import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a course title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a course description'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide a category'],
    },
    instructor: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String, // URL from Appwrite
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    duration: {
      type: String, // e.g., "30 days", "12 weeks"
      trim: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    content: {
      type: String, // Detailed course content (markdown or HTML)
      trim: true,
    },
    videoUrl: {
      type: String, // Main video URL from Appwrite
      trim: true,
    },
    resources: [
      {
        title: String,
        url: String, // PDF/document URL from Appwrite
        type: { type: String, enum: ['pdf', 'document', 'video', 'link'], default: 'pdf' },
      },
    ],
    chapters: [
      {
        title: { type: String, required: true },
        description: { type: String },
        order: { type: Number, default: 0 },
        items: [
          {
            title: { type: String, required: true },
            type: { type: String, enum: ['video', 'pdf', 'link', 'document'], default: 'video' },
            url: { type: String },
            description: { type: String },
            duration: { type: String },
            order: { type: Number, default: 0 },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviews: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
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

// Index for search
courseSchema.index({ title: 'text', description: 'text' });

const Course = mongoose.model('Course', courseSchema);

export default Course;
