export interface FixedSeries {
  _id: string;
  title: string;
  description: string;
  seriesType: 'S1' | 'S2' | 'S3' | 'S4';
  // description for UI cards, may include custom labels per curriculum
  seriesTypeLabel:
    | 'Full Syllabus'
    | '50% Syllabus'
    | '30% Syllabus'
    | 'CA Successful Specials'
    | 'Chapterwise';
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  cardThumbnail?: string;
  mode?: string;
  group?: string;
  subjects?: string[];
  groups?: {
    group1?: string[];
    group2?: string[];
  };
  pricing?: {
    subjectPrice?: number; // ₹450 per individual subject
    seriesCount?: number; // override number of series for S1 (e.g. inter-s1 has 2)
    comboPrice?: number; // ₹1200 for 3+ subjects
    allSubjectsPrice?: number; // ₹2000 for all 5 subjects (single series for S1)
    allSeriesAllSubjectsPrice?: number; // ₹6000 for all 3 series + all subjects (S1 only)
    paperPrice?: number; // ₹400 per paper
    papersPerSubject?: { [subject: string]: number }; // papers per subject breakdown
  };
  discountCodes?: Array<{ code: string; type: 'flat' | 'percent'; value: number; label?: string }>;
  
  // Subadmin-editable fields
  highlights?: string[];
  syllabusBreakdown?: string;
  testSchedule?: Array<{ testName: string; date: string; subjects: string }>;
  instructions?: string;
  sampleAnswerSheets?: Array<{ name: string; url: string }>;
  papersPerSubject?: { [subject: string]: number }; // kept for backward compatibility
  
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
    title: 'Full Syllabus Test Series',
    description: `Full Syllabus Test Series

Best suited for students who have completed the syllabus

Full-length exam-oriented question papers

Available in Series 1, Series 2 & Series 3

Helps in real exam time management practice

Enroll subject-wise, group-wise or series-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 450,
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
Full Syllabus Test Series Structure:

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
      series1UploadDate: 'Papers will be uploaded from 1st February 2025',
      series2UploadDate: 'Papers will be uploaded from 7th March 2026',
      series3UploadDate: 'Papers will be uploaded from 5th April 2026',
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
    cardTitle: 'Full Syllabus',
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
    title: '50% Syllabus Test Series',
    description: `50% Syllabus Test Series

Ideal for students who want to test preparation in two phases

2 Papers per subject

50% + 50% syllabus coverage = 100%

Helps in gradual and structured syllabus completion

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
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
      paperPrice: 450,
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
50% Syllabus Test Series Structure:

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
    cardTitle: '50% Syllabus',
    cardDescription: '10 Papers × High-Yield Topics = Smart Prep',
    isActive: true,
    displayOrder: 2,
  },
  {
    _id: 's3',
    title: '30% Syllabus Test Series',
    description: `30% Syllabus Test Series

Perfect for early-stage CA preparation

Syllabus divided into smaller and manageable parts

3 Papers per subject

30% + 30% + 30% syllabus coverage = 100%

Helps in concept-wise and topic-wise preparation

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
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
      paperPrice: 450,
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
30% Syllabus Test Series Structure:

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
    cardTitle: '30% Syllabus',
    cardDescription: '15 Papers × Critical Topics = Quick Revision',
    isActive: true,
    displayOrder: 3,
  },
  {
    _id: 's4',
    title: 'CA Successful Specials',
    description: `CA Successful Test Series

Designed for serious CA aspirants aiming for exam success

Total 6 papers per subject for multiple revisions

1 Full syllabus paper (100% coverage)

2 Half syllabus papers (50% + 50%)

3 Part syllabus papers (30% + 30% + 30%)

Complete syllabus covered with repeated practice

Enroll subject-wise or group-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 2000,
    mode: 'Online',
    group: 'Both',
    subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
    pricing: {
      subjectPrice: 1200,
      comboPrice: 3600,
      allSubjectsPrice: 6000,
      paperPrice: 450,
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
CA Successful Specials Test Series Structure:

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
    cardTitle: 'CA Successful Specials',
    cardDescription: '30 Papers × All Levels = Complete Mastery',
    isActive: true,
    displayOrder: 4,
  },
];

export const FIXED_TEST_SERIES_INTER: FixedSeries[] = [
  {
    _id: 'inter-s1',
    title: 'Full Syllabus Test Series (Inter)',
    description: `Full Syllabus Test Series for CA Inter

Best suited for students who have completed the syllabus

Full-length exam-oriented question papers

Available in Series 1 & Series 2

Helps in real exam time management practice

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S1',
    seriesTypeLabel: 'Full Syllabus',
    price: 400,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    groups: {
      group1: ['Advance accounting', 'Corporate law', 'Taxation'],
      group2: ['Costing', 'Audit', 'FM SM'],
    },
    pricing: {
      subjectPrice: 400,
      seriesCount: 2, // inter full syllabus includes two series by default
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 4000,
      paperPrice: 400,
      papersPerSubject: {
        'Advance accounting': 1,
        'Corporate law': 1,
        'Taxation': 1,
        'Costing': 1,
        'Audit': 1,
        'FM SM': 1,
      },
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [
      '2 Complete Series (Series 1, Series 2)',
      '1 Test Paper Per Subject Per Series',
      '12 Total Test Papers for All 6 Subjects',
      'Full Syllabus Coverage for CA Inter',
      'Group-wise Selection Support',
    ],
    syllabusBreakdown: `
Full Syllabus Test Series (Inter) Structure:

Series: Series 1, Series 2 (2 complete series)

Groups & Subjects:
- Group 1: Advance accounting, Corporate law, Taxation (3 subjects)
- Group 2: Costing, Audit, FM SM (3 subjects)
- Both: All 6 Subjects

Papers per Subject:
- Each subject: 1 paper per series
- Total: 2 series × 6 subjects × 1 paper = 12 papers (all subjects)
- Group 1: 2 series × 3 subjects × 1 paper = 6 papers
- Group 2: 2 series × 3 subjects × 1 paper = 6 papers

Coverage:
- Complete syllabus coverage across both series
- Group-wise categorization for focused preparation
    `,
    papersPerSubject: {
      'Advance accounting': 1,
      'Corporate law': 1,
      'Taxation': 1,
      'Costing': 1,
      'Audit': 1,
      'FM SM': 1,
    },
    cardTitle: 'Full Syllabus (Inter)',
    cardDescription: '2 Series × 1 Paper Per Subject = Complete Prep',
    isActive: true,
    displayOrder: 1,
  },
  {
    _id: 'inter-s2',
    title: '50% Syllabus Test Series (Inter)',
    description: `50% Syllabus Test Series (CA Inter)

Focused 50% syllabus coverage for CA Inter

2 Papers per subject

50% + 50% syllabus coverage = 100%

Helps in gradual and structured syllabus completion

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S2',
    seriesTypeLabel: '50% Syllabus',
    price: 400,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    groups: {
      group1: ['Advance accounting', 'Corporate law', 'Taxation'],
      group2: ['Costing', 'Audit', 'FM SM'],
    },
    pricing: {
      subjectPrice: 400,
      comboPrice: 1200,
      allSubjectsPrice: 2400,
      paperPrice: 400,
      papersPerSubject: {
        'Advance accounting': 2,
        'Corporate law': 2,
        'Taxation': 2,
        'Costing': 2,
        'Audit': 2,
        'FM SM': 2,
      },
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [
      '2 Papers Per Subject',
      '12 Total Test Papers for All 6 Subjects',
      '50% Syllabus Coverage',
      'Group-wise Selection Support',
      'High-Yield Topics Focus',
    ],
    syllabusBreakdown: `
50% Syllabus Test Series (Inter) Structure:

Groups & Subjects:
- Group 1: Advance accounting, Corporate law, Taxation (3 subjects)
- Group 2: Costing, Audit, FM SM (3 subjects)
- Both: All 6 Subjects

Papers per Subject: 2 papers

Coverage:
- Covers the most important 50% of the syllabus
- Focus on high-yield topics
- Group 1 (3 subjects): 6 papers
- Group 2 (3 subjects): 6 papers
- Both Groups (6 subjects): 12 papers
    `,
    cardTitle: '50% Syllabus (Inter)',
    cardDescription: '2 Papers Per Subject — Targeted Prep',
    isActive: true,
    displayOrder: 2,
  },
  {
    _id: 'inter-s3',
    title: 'Chapterwise Test Series (Inter)',
    description: `Chapterwise Test Series (CA Inter)

Chapterwise practice divided into manageable parts

5 Papers per subject

Chapter-by-chapter coverage enabling concept clarity

Perfect for topic-wise and chapter-wise preparation

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S3',
    seriesTypeLabel: 'Chapterwise',
    price: 800,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    groups: {
      group1: ['Advance accounting', 'Corporate law', 'Taxation'],
      group2: ['Costing', 'Audit', 'FM SM'],
    },
    pricing: {
      subjectPrice: 800,
      comboPrice: 2400,
      allSubjectsPrice: 4800,
      paperPrice: 800,
      papersPerSubject: {
        'Advance accounting': 5,
        'Corporate law': 5,
        'Taxation': 5,
        'Costing': 5,
        'Audit': 5,
        'FM SM': 5,
      },
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 100, label: 'CAINTER2026 - ₹100 off' },
    ],
    highlights: [
      '5 Papers Per Subject',
      '30 Total Test Papers for All 6 Subjects',
      'Chapterwise Practice Coverage',
      'Group-wise Selection Support',
      'Deep Practice Material',
    ],
    syllabusBreakdown: `
Chapterwise Test Series (Inter) Structure:

Groups & Subjects:
- Group 1: Advance accounting, Corporate law, Taxation (3 subjects)
- Group 2: Costing, Audit, FM SM (3 subjects)
- Both: All 6 Subjects

Papers per Subject: 5 papers

Subject-wise Breakdown:
- Advance accounting: 5 papers • ₹400
- Corporate law: 5 papers • ₹400
- Taxation: 5 papers • ₹400
- Costing: 5 papers • ₹400
- Audit: 5 papers • ₹400
- FM SM: 5 papers • ₹400

Coverage:
- Comprehensive chapterwise practice
- Group 1 (3 subjects): 15 papers
- Group 2 (3 subjects): 15 papers
- Both Groups (6 subjects): 30 papers
    `,
    cardTitle: 'Chapterwise (Inter)',
    cardDescription: '5 Papers Per Subject — Deep Practice',
    isActive: true,
    displayOrder: 3,
  },
  {
    _id: 'inter-s4',
    title: 'CA Successful Specials (Inter)',
    description: `CA Successful Specials (Inter)

Designed for serious CA Inter aspirants aiming for exam success

Total 8 papers per subject for multiple revisions

1 Full syllabus paper (100% coverage)

2 Half syllabus papers (50% + 50%)

5 Chapterwise Full syllabus papers (5 Papers)

Comprehensive practice for all topics

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    seriesType: 'S4',
    seriesTypeLabel: 'CA Successful Specials',
    price: 1600,
    mode: 'Online',
    group: 'Both',
    subjects: ['Advance accounting', 'Corporate law', 'Taxation', 'Costing', 'Audit', 'FM SM'],
    groups: {
      group1: ['Advance accounting', 'Corporate law', 'Taxation'],
      group2: ['Costing', 'Audit', 'FM SM'],
    },
    pricing: {
      subjectPrice: 1600,
      comboPrice: 4800,
      allSubjectsPrice: 9600,
      paperPrice: 400,
      papersPerSubject: {
        'Advance accounting': 8,
        'Corporate law': 8,
        'Taxation': 8,
        'Costing': 8,
        'Audit': 8,
        'FM SM': 8,
      },
    },
    discountCodes: [
      { code: 'CAINTER2026', type: 'flat', value: 200, label: 'CAINTER2026 - ₹200 off' },
    ],
    highlights: [
      '8 Papers Per Subject',
      '48 Total Test Papers for All 6 Subjects',
      'Expert Curated Series',
      'Group-wise Selection Support',
      'Complete Intensive Coverage',
    ],
    syllabusBreakdown: `
CA Successful Specials (Inter) Structure:

Series: Group-wise (NOT series-wise)

Groups & Subjects:
- Group 1: Advance accounting, Corporate law, Taxation (3 subjects)
- Group 2: Costing, Audit, FM SM (3 subjects)
- Both: All 6 Subjects

Papers per Subject: 8 papers

Subject-wise Breakdown:
- Advance accounting: 8 papers • ₹1,200
- Corporate law: 8 papers • ₹1,200
- Taxation: 8 papers • ₹1,200
- Costing: 8 papers • ₹1,200
- Audit: 8 papers • ₹1,200
- FM SM: 8 papers • ₹1,200

Coverage:
- Comprehensive expert-curated papers
- Group 1 (3 subjects): 24 papers
- Group 2 (3 subjects): 24 papers
- Both Groups (6 subjects): 48 papers
- Complete preparation from CA Successful team
    `,
    cardTitle: 'CA Successful Specials (Inter)',
    cardDescription: '8 Papers Per Subject — Intensive',
    isActive: true,
    displayOrder: 4,
  },
];

export function getFixedSeriesById(id?: string) {
  if (!id) return null;
  const fromFinal = FIXED_TEST_SERIES.find((s) => s._id === id);
  if (fromFinal) return fromFinal;
  const fromInter = FIXED_TEST_SERIES_INTER.find((s) => s._id === id);
  if (fromInter) return fromInter;
  return null;
}
