import mongoose from 'mongoose';

const testSeriesPaperSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeries',
      required: [true, 'testSeriesId is required'],
    },
    // Series info (only for S1, null for S2, S3, S4)
    series: {
      type: String,
      enum: ['series1', 'series2', 'series3', null],
      default: null,
    },
    // Group info (for all series types)
    group: {
      type: String,
      enum: ['Group 1', 'Group 2', 'Both'],
      required: true,
    },
    // Subject info
    subject: {
      type: String,
      enum: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
      required: true,
    },
    // Paper type
    paperType: {
      type: String,
      enum: ['question', 'suggested', 'evaluated'],
      required: true,
    },
    // Paper details
    paperNumber: {
      type: Number, // 1, 2, 3, etc.
      default: 1,
    },
    syllabusPercentage: {
      type: String,
      enum: ['100%', '50%', '30%'],
      default: '100%',
    },
    // File information
    fileName: {
      type: String,
      trim: true,
    },
    appwriteFileId: {
      type: String,
      trim: true,
    },
    appwriteBucketId: {
      type: String,
      trim: true,
    },
    publicFileUrl: {
      type: String,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
    },
    // Availability
    availabilityDate: {
      type: Date,
      default: () => new Date(),
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Status - single source of truth for visibility
    status: {
      type: String,
      enum: ['draft','published','archived'],
      default: 'published',
      index: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['user','subadmin','admin'],
      default: 'subadmin',
    },
    // Status
    isEvaluated: {
      type: Boolean,
      default: false,
    },
    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries and visibility filtering
testSeriesPaperSchema.index({ testSeriesId: 1, group: 1, subject: 1, paperType: 1 });
// Speed up queries for published papers
testSeriesPaperSchema.index({ testSeriesId: 1, status: 1 });
const TestSeriesPaper = mongoose.model('TestSeriesPaper', testSeriesPaperSchema);

export default TestSeriesPaper;
