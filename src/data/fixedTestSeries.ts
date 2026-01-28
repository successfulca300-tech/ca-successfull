export interface FixedSeries {
  _id: string;
  title: string;
  description: string;
  seriesType: 'S1' | 'S2' | 'S3' | 'S4';
  seriesTypeLabel: 'Full Syllabus' | '50% Syllabus' | '30% Syllabus' | 'CA Successful Specials';
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  cardThumbnail?: string;
  mode?: string;
  group?: string;
  subjects?: string[];
  pricing?: {
    subjectPrice?: number; // ₹450 per individual subject
    comboPrice?: number; // ₹1200 for 3+ subjects
    allSubjectsPrice?: number; // ₹2000 for all 5 subjects (single series for S1)
    allSeriesAllSubjectsPrice?: number; // ₹6000 for all 3 series + all subjects (S1 only)
    paperPrice?: number; // ₹400 per paper
  };
  discountCodes?: Array<{ code: string; type: 'flat' | 'percent'; value: number; label?: string }>;
  
  // Subadmin-editable fields
  highlights?: string[];
  syllabusBreakdown?: string;
  testSchedule?: Array<{ testName: string; date: string; subjects: string }>;
  instructions?: string;
  sampleAnswerSheets?: Array<{ name: string; url: string }>;
  papersPerSubject?: { [subject: string]: number };
  
  // Series details (for S1: 3 series, for others: group-wise)
  seriesDates?: {
    series1UploadDate?: string;
    series2UploadDate?: string;
    series3UploadDate?: string;
    group1SubmissionDate?: string;
    group2SubmissionDate?: string;
  };
  
  // Subject-wise date schedule for 3 series
  subjectDateSchedule?: Array<{
    subject: string;
    series1Date?: string;
    series2Date?: string;
    series3Date?: string;
  }>;
  
  // Listing page fields
  cardTitle?: string;
  cardDescription?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export const FIXED_TEST_SERIES: FixedSeries[] = [
  {
    _id: 's1',
    title: 'S1 Full Syllabus Test Series',
    description: 'Comprehensive full-syllabus test series with 3 series (Series 1, 2, 3), each containing 1 test paper per subject.',
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 6000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [
      '3 Complete Test Series (Series 1, 2, 3)',
      '1 Test Paper Per Subject Per Series',
      '15 Total Test Papers',
      'Full Syllabus Coverage',
      'Group-wise Categorization',
      'Detailed Solutions',
      'Performance Analytics',
    ],
    syllabusBreakdown: `
S1 Full Syllabus Test Series Structure:

Series: Series 1, Series 2, Series 3 (3 complete series)

Groups & Subjects:
- Group 1: FR, AFM, Audit (3 subjects)
- Group 2: DT, IDT (2 subjects)
- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)

Papers per Subject:
- Each subject: 1 paper per series
- Total: 3 series × 5 subjects × 1 paper = 15 papers

Coverage:
- Comprehensive coverage of full syllabus
- All topics and key concepts covered
- Difficulty progression from beginner to advanced
    `,
    seriesDates: {
      series1UploadDate: 'Papers will be uploaded by 10th December 2025',
      series2UploadDate: 'Papers will be uploaded by 15th February 2026',
      series3UploadDate: 'Papers will be uploaded by 20th March 2026',
      group1SubmissionDate: '25th April 2026',
      group2SubmissionDate: '30th April 2026',
    },
    papersPerSubject: {
      'FR': 1,
      'AFM': 1,
      'Audit': 1,
      'DT': 1,
      'IDT': 1,
    },
    testSchedule: [
      {
        testName: 'FR - Series 1',
        date: '10th December 2025',
        subjects: 'Financial Reporting',
      },
      {
        testName: 'AFM - Series 1',
        date: '12th December 2025',
        subjects: 'Advanced Financial Management',
      },
      {
        testName: 'Audit - Series 1',
        date: '14th December 2025',
        subjects: 'Audit and Assurance',
      },
    ],
    cardTitle: 'S1 Full Syllabus',
    cardDescription: '3 Series × 1 Paper Per Subject = Complete Preparation',
    subjectDateSchedule: [
      { subject: 'FR', series1Date: '10-12-2025', series2Date: '15-02-2026', series3Date: '21-03-2026' },
      { subject: 'AFM', series1Date: '24-12-2025', series2Date: '22-02-2026', series3Date: '25-03-2026' },
      { subject: 'Audit', series1Date: '07-01-2026', series2Date: '01-03-2026', series3Date: '29-03-2026' },
      { subject: 'DT', series1Date: '21-01-2026', series2Date: '08-03-2026', series3Date: '02-04-2026' },
      { subject: 'IDT', series1Date: '04-02-2026', series2Date: '15-03-2026', series3Date: '06-04-2026' },
    ],
    isActive: true,
    displayOrder: 1,
  },
  {
    _id: 's2',
    title: 'S2 50% Syllabus Test Series',
    description: 'Focused test series covering the most important 50% of the syllabus. 2 test papers per subject across all groups.',
    seriesType: 'S2',
    seriesTypeLabel: '50% Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [
      'Group-wise Test Papers',
      '2 Papers Per Subject (50% Each)',
      '10 Total Test Papers',
      '50% Syllabus Coverage',
      'High-Yield Topics Focus',
      'Detailed Solutions',
      'Performance Analytics',
    ],
    syllabusBreakdown: `
S2 50% Syllabus Test Series Structure:

Series: Group-wise (NOT series-wise)

Groups & Subjects:
- Group 1: FR, AFM, Audit (3 subjects)
- Group 2: DT, IDT (2 subjects)
- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)

Papers per Subject:
- Each subject: 2 papers (each covering 50% syllabus)
- Total: 5 subjects × 2 papers = 10 papers

Coverage:
- Covers the most important 50% of the syllabus
- Focus on high-yield topics
- 2 variations per subject with different 50% combinations
- Ideal for targeted preparation
    `,
    seriesDates: {
      group1SubmissionDate: '25th April 2026',
      group2SubmissionDate: '30th April 2026',
    },
    papersPerSubject: {
      'FR': 2,
      'AFM': 2,
      'Audit': 2,
      'DT': 2,
      'IDT': 2,
    },
    cardTitle: 'S2 50% Syllabus',
    cardDescription: '10 Papers × High-Yield Topics = Smart Prep',
    isActive: true,
    displayOrder: 2,
  },
  {
    _id: 's3',
    title: 'S3 30% Syllabus Test Series',
    description: 'Short, high-yield test series covering the top 30% topics. 3 test papers per subject across all groups.',
    seriesType: 'S3',
    seriesTypeLabel: '30% Syllabus',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [
      'Group-wise Test Papers',
      '3 Papers Per Subject (30% Each)',
      '15 Total Test Papers',
      '30% Syllabus Coverage',
      'Critical Topics Focus',
      'Detailed Solutions',
      'Performance Analytics',
    ],
    syllabusBreakdown: `
S3 30% Syllabus Test Series Structure:

Series: Group-wise (NOT series-wise)

Groups & Subjects:
- Group 1: FR, AFM, Audit (3 subjects)
- Group 2: DT, IDT (2 subjects)
- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)

Papers per Subject:
- Each subject: 3 papers (each covering 30% syllabus)
- Total: 5 subjects × 3 papers = 15 papers

Coverage:
- Covers the top 30% of the syllabus
- Focus on critical and exam-focused topics
- 3 variations per subject with different 30% combinations
- Perfect for last-minute revision
    `,
    seriesDates: {
      group1SubmissionDate: '25th April 2026',
      group2SubmissionDate: '30th April 2026',
    },
    papersPerSubject: {
      'FR': 3,
      'AFM': 3,
      'Audit': 3,
      'DT': 3,
      'IDT': 3,
    },
    cardTitle: 'S3 30% Syllabus',
    cardDescription: '15 Papers × Critical Topics = Quick Revision',
    isActive: true,
    displayOrder: 3,
  },
  {
    _id: 's4',
    title: 'S4 CA Successful Specials',
    description: 'Special curated test series with 6 papers per subject combining 100%, 50%, and 30% syllabus coverage.',
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      paperPrice: 400,
    },
    discountCodes: [
      { code: 'CA2026', type: 'flat', value: 100, label: 'CA2026 - ₹100 off' },
      { code: 'CA10', type: 'percent', value: 10, label: 'CA10 - 10% off' },
    ],
    highlights: [
      'Group-wise Test Papers',
      '6 Papers Per Subject (1 Full + 2 Half + 3 Thirty)',
      '30 Total Test Papers',
      'Complete Preparation Mix',
      'All Difficulty Levels',
      'Detailed Solutions',
      'Performance Analytics',
      'Expert Curated Papers',
    ],
    syllabusBreakdown: `
S4 CA Successful Specials Test Series Structure:

Series: Group-wise (NOT series-wise)

Groups & Subjects:
- Group 1: FR, AFM, Audit (3 subjects)
- Group 2: DT, IDT (2 subjects)
- Both: All 5 Subjects (FR, AFM, Audit, DT, IDT)

Papers per Subject:
- 1 × 100% Syllabus Paper
- 2 × 50% Syllabus Papers
- 3 × 30% Syllabus Papers
- Total per subject: 6 papers
- Grand Total: 5 subjects × 6 papers = 30 papers

Coverage:
- Comprehensive mix of all difficulty levels
- 100% coverage for complete understanding
- 50% coverage for focused preparation
- 30% coverage for high-yield topics
- Expert-curated from CA Successful team
- Perfect all-in-one test series
    `,
    seriesDates: {
      group1SubmissionDate: '25th April 2026',
      group2SubmissionDate: '30th April 2026',
    },
    papersPerSubject: {
      'FR': 6,
      'AFM': 6,
      'Audit': 6,
      'DT': 6,
      'IDT': 6,
    },
    cardTitle: 'S4 CA Successful Specials',
    cardDescription: '30 Papers × All Levels = Complete Mastery',
    isActive: true,
    displayOrder: 4,
  },
];

export function getFixedSeriesById(id?: string) {
  if (!id) return null;
  return FIXED_TEST_SERIES.find((s) => s._id === id) || null;
}
