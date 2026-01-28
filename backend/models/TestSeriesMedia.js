import mongoose from 'mongoose';

const testSeriesMediaSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: String,
      required: true,
      enum: ['s1', 's2', 's3', 's4'],
      index: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ['thumbnail', 'video', 'image', 'pdf', 'document'],
    },
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previousFileId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Create index to ensure only one active thumbnail and one active video per series
testSeriesMediaSchema.index(
  { testSeriesId: 1, mediaType: 1, status: 1 },
  { unique: true, sparse: true }
);

const TestSeriesMedia = mongoose.model('TestSeriesMedia', testSeriesMediaSchema);

export default TestSeriesMedia;
