/**
 * Test Series Pricing Calculator
 * Supports 4 types: S1, S2, S3, S4
 */

export const calculateTestSeriesPrice = (params) => {
  const {
    seriesType = 'S1',
    selectedSeries = [], // For S1: ['series1', 'series2', 'series3']
    selectedGroup = null, // 'Group 1', 'Group 2', 'Both'
    selectedSubjects = [], // ['FR', 'AFM', 'Audit', 'DT', 'IDT']
    pricing = {},
  } = params;

  const subjectPrice = pricing.subjectPrice || 450;
  const comboPrice = pricing.comboPrice || 1200;
  const allSubjectsPrice = pricing.allSubjectsPrice || 2000;
  const allSeriesAllSubjectsPrice = pricing.allSeriesAllSubjectsPrice || 6000;
  const paperPrice = pricing.paperPrice || 400;

  let basePrice = 0;
  let totalPapers = 0;

  if (seriesType === 'S1') {
    // S1: FULL SYLLABUS - Series-wise pricing
    // 3 series (series1, series2, series3)
    // 1 paper per subject per series
    // Group 1: FR, AFM, Audit (3 subjects)
    // Group 2: DT, IDT (2 subjects)
    // Both: All 5 subjects

    const seriesCount = selectedSeries.length;
    const subjectCount = selectedSubjects.length;

    if (seriesCount === 0 || !selectedGroup || subjectCount === 0) {
      return { basePrice: 0, totalPapers: 0, finalPrice: 0 };
    }

    // Check if all 5 subjects selected
    if (subjectCount === 5 && selectedGroup === 'Both') {
      // All 3 series + all 5 subjects
      if (seriesCount === 3) {
        basePrice = allSeriesAllSubjectsPrice; // ₹6000
      } else {
        // Partial series with all subjects
        basePrice = allSubjectsPrice * seriesCount; // ₹2000 per series
      }
    } else if (subjectCount === 5 && selectedGroup !== 'Both') {
      // All 5 subjects in single group (not valid, but handle it)
      basePrice = allSubjectsPrice * seriesCount;
    } else if (subjectCount >= 3) {
      // Combo: 3 or more subjects
      basePrice = comboPrice * seriesCount;
    } else {
      // Individual subjects
      basePrice = subjectCount * subjectPrice * seriesCount;
    }

    // Calculate papers
    totalPapers = subjectCount * 1 * seriesCount; // 1 paper per subject per series

  } else if (seriesType === 'S2') {
    // S2: 50% SYLLABUS - Group-wise (NOT series-wise)
    // 2 papers per subject per group
    // Total: 5 subjects × 2 papers = 10 papers

    const subjectCount = selectedSubjects.length;

    if (!selectedGroup || subjectCount === 0) {
      return { basePrice: 0, totalPapers: 0, finalPrice: 0 };
    }

    // Same pricing logic as S1 but no series multiplier
    if (subjectCount === 5) {
      basePrice = allSubjectsPrice; // ₹2000 for all subjects
    } else if (subjectCount >= 3) {
      basePrice = comboPrice;
    } else {
      basePrice = subjectCount * subjectPrice;
    }

    // Papers: 2 per subject
    totalPapers = subjectCount * 2;

  } else if (seriesType === 'S3') {
    // S3: 30% SYLLABUS - Group-wise (NOT series-wise)
    // 3 papers per subject per group
    // Total: 5 subjects × 3 papers = 15 papers

    const subjectCount = selectedSubjects.length;

    if (!selectedGroup || subjectCount === 0) {
      return { basePrice: 0, totalPapers: 0, finalPrice: 0 };
    }

    // Same pricing logic as S2
    if (subjectCount === 5) {
      basePrice = allSubjectsPrice;
    } else if (subjectCount >= 3) {
      basePrice = comboPrice;
    } else {
      basePrice = subjectCount * subjectPrice;
    }

    // Papers: 3 per subject
    totalPapers = subjectCount * 3;

  } else if (seriesType === 'S4') {
    // S4: CA SUCCESSFUL SPECIALS - Group-wise (NOT series-wise)
    // 6 papers per subject (1×100% + 2×50% + 3×30%)
    // Total: 5 subjects × 6 papers = 30 papers

    const subjectCount = selectedSubjects.length;

    if (!selectedGroup || subjectCount === 0) {
      return { basePrice: 0, totalPapers: 0, finalPrice: 0 };
    }

    // Same pricing logic
    if (subjectCount === 5) {
      basePrice = allSubjectsPrice;
    } else if (subjectCount >= 3) {
      basePrice = comboPrice;
    } else {
      basePrice = subjectCount * subjectPrice;
    }

    // Papers: 6 per subject
    totalPapers = subjectCount * 6;
  }

  return {
    basePrice,
    totalPapers,
    finalPrice: basePrice,
  };
};

export const getSubjectsByGroup = (group) => {
  const allSubjects = {
    'Group 1': ['FR', 'AFM', 'Audit'],
    'Group 2': ['DT', 'IDT'],
    'Both': ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
  };
  return allSubjects[group] || [];
};

export const getPapersPerSubject = (seriesType) => {
  const papersConfig = {
    'S1': 1,
    'S2': 2,
    'S3': 3,
    'S4': 6,
  };
  return papersConfig[seriesType] || 0;
};

export const getSeriesTypeLabel = (seriesType) => {
  const labels = {
    'S1': 'Full Syllabus',
    'S2': '50% Syllabus',
    'S3': '30% Syllabus',
    'S4': 'CA Successful Specials',
  };
  return labels[seriesType] || '';
};
