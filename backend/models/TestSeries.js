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
    // Optional fixed key for mapping frontend fixed entries (e.g., 's1' or 'inter-s1')
    fixedKey: {
      type: String,
      trim: true,
      index: true,
    },
    seriesTypeLabel: {
      type: String,
      enum: ['Full Syllabus', '50% Syllabus', '30% Syllabus', 'CA Successful Specials'],
      required: true,
    },
    // Exam level to separate CA Inter vs CA Final management
    examLevel: {
      type: String,
      enum: ['inter', 'final'],
      default: 'final',
      required: true,
    },
    // Category is optional for auto-created shorthand series (S1..S4)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: false,
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
    // Optional listing overrides from subadmin
    cardTitle: { type: String, trim: true },
    cardDescription: { type: String, trim: true },
    // Full overview/marketing text shown on detail page (editable by subadmin)
    overview: { type: String, trim: true },
    // Subject-wise schedule (S1): [{ subject, series1Date, series2Date, series3Date }]
    subjectDateSchedule: [
      {
        subject: String,
        series1Date: String,
        series2Date: String,
        series3Date: String,
      },
    ],
    // Short disclaimer or instructions provided by subadmin
    disclaimer: { type: String, trim: true },

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
      // New explicit submission deadline for S1
      submissionDeadline: String,
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
