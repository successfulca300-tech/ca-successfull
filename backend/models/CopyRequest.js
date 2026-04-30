import mongoose from 'mongoose';

const copyRequestSchema = new mongoose.Schema(
  {
    // Which teacher is requesting
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // How many copies requested
    numberOfCopies: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Reason for request (optional)
    reason: {
      type: String,
      trim: true,
    },
    // Request status
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    // SubAdmin response
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    approvalComment: {
      type: String,
      trim: true,
    },
    // For tracking history
    requestNumber: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const CopyRequest = mongoose.model('CopyRequest', copyRequestSchema);

export default CopyRequest;
