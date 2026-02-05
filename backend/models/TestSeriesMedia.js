import mongoose from 'mongoose';

const testSeriesMediaSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeries',
      required: [true, 'testSeriesId is required'],
      index: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ['thumbnail', 'video'],
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
    uploadedByRole: {
      type: String,
      enum: ['user','subadmin','admin'],
      default: 'subadmin',
    },
    previousFileId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['published', 'archived'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure only one published thumbnail/video per TestSeries
testSeriesMediaSchema.index(
  { testSeriesId: 1, mediaType: 1 },
  { unique: true, partialFilterExpression: { status: 'published' } }
);

const TestSeriesMedia = mongoose.model('TestSeriesMedia', testSeriesMediaSchema);

export default TestSeriesMedia;
