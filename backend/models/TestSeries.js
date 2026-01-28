import mongoose from 'mongoose';

const testSeriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a test series title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    seriesType: {
      type: String,
      enum: ['S1', 'S2', 'S3', 'S4'],
      required: [true, 'Please specify series type (S1, S2, S3, or S4)'],
    },
    seriesTypeLabel: {
      type: String,
      enum: ['Full Syllabus', '50% Syllabus', '30% Syllabus', 'CA Successful Specials'],
      required: true,
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
    cardThumbnail: {
      type: String,
      trim: true,
    },
    // Pricing configuration for S1 (series-wise)
    pricing: {
      subjectPrice: {
        type: Number,
        default: 450, // Individual subject price
      },
      comboPrice: {
        type: Number,
        default: 1200, // 3+ subjects price
      },
      allSubjectsPrice: {
        type: Number,
        default: 2000, // All 5 subjects single series price
      },
      allSeriesAllSubjectsPrice: {
        type: Number,
        default: 6000, // All 3 series + all subjects price
      },
      paperPrice: {
        type: Number,
        default: 400,
      },
    },
    // Discount codes
    discountCodes: [
      {
        code: String,
        type: {
          type: String,
          enum: ['flat', 'percent'],
        },
        value: Number,
        label: String,
      },
    ],
    // Series details for S1 (series 1, 2, 3 only - NO Series 4)
    seriesDates: {
      series1UploadDate: String,
      series2UploadDate: String,
      series3UploadDate: String,
      group1SubmissionDate: String,
      group2SubmissionDate: String,
    },
    // Test schedule recommendation
    testSchedule: [
      {
        testName: String,
        date: String,
        subjects: String,
      },
    ],
    subjects: [String], // [FR, AFM, Audit, DT, IDT]
    group: String, // For display purposes
    
    // Paper configuration
    papersPerSubject: {
      // S1: 1 paper per subject per series
      // S2: 2 papers per subject per group
      // S3: 3 papers per subject per group
      // S4: 6 papers per subject per group
      type: mongoose.Schema.Types.Mixed,
    },
    
    // Highlights
    highlights: [String],
    
    // Sample answer sheets
    sampleAnswerSheets: [
      {
        name: String,
        url: String,
      },
    ],
    
    // Test pattern / syllabus breakdown
    syllabusBreakdown: String,
    syllabusType: String, // 'Full Syllabus', '50% Syllabus', '30% Syllabus', 'Special'
    
    instructions: String,
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishStatus: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const TestSeries = mongoose.model('TestSeries', testSeriesSchema);

export default TestSeries;
