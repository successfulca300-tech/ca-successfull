import mongoose from 'mongoose';

const freeResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a resource title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a resource description'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide a category'],
    },
    thumbnail: {
      type: String, // URL from Appwrite
      trim: true,
    },
    fileUrl: {
      type: String, // PDF/Document file URL from Appwrite
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
    resourceType: {
      type: String,
      enum: ['notes', 'pdf', 'document', 'study-material'],
      default: 'document',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    downloads: {
      type: Number,
      default: 0,
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

// Index for search functionality
freeResourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

const FreeResource = mongoose.model('FreeResource', freeResourceSchema);

export default FreeResource;
