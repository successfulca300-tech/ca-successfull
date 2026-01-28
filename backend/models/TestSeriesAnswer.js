import mongoose from 'mongoose';

const testSeriesAnswerSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeries',
      required: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestSeriesPaper',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Answer sheet submission
    answerSheetFileId: {
      type: String,
      trim: true,
    },
    answerSheetAppwriteBucketId: {
      type: String,
      trim: true,
    },
    answerSheetUrl: {
      type: String,
      trim: true,
    },
    answerSheetFileName: {
      type: String,
      trim: true,
    },
    submissionDate: {
      type: Date,
      default: () => new Date(),
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    // Evaluation data
    marksObtained: {
      type: Number,
      default: 0,
    },
    maxMarks: {
      type: Number,
      default: 100,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    evaluatorComments: {
      type: String,
      trim: true,
    },
    evaluatedAt: {
      type: Date,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isEvaluated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const TestSeriesAnswer = mongoose.model('TestSeriesAnswer', testSeriesAnswerSchema);

export default TestSeriesAnswer;
