import mongoose from 'mongoose';

const publishRequestSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ['course', 'testSeries', 'resource'],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Can reference Course, TestSeries, or Resource
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
    requestNotes: String,
    reviewDate: Date,
  },
  {
    timestamps: true,
  }
);

const PublishRequest = mongoose.model('PublishRequest', publishRequestSchema);

export default PublishRequest;
