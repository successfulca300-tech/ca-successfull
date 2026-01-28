/**
 * Test Series Pricing Service
 * 
 * CRITICAL: ALL pricing and paper count logic is calculated here.
 * Frontend must NOT perform any calculations.
 * Backend is the SINGLE SOURCE OF TRUTH.
 */

/**
 * Calculate paper count for a test series selection
 * 
 * @param {string} seriesType - 'S1' | 'S2' | 'S3' | 'S4'
 * @param {string[]} selectedSeries - ['series1', 'series2', 'series3'] for S1 only
 * @param {string[]} selectedSubjects - ['FR', 'AFM', ...] selected by user
 * @returns {number} Total paper count
 */
export const calculatePaperCount = (seriesType, selectedSeries = [], selectedSubjects = []) => {
  const subjectCount = selectedSubjects.length;
  
  if (!subjectCount) return 0;

  switch (seriesType) {
    case 'S1': {
      // S1: 1 paper per subject per series
      const seriesCount = selectedSeries.length;
      return subjectCount * 1 * seriesCount;
    }
    case 'S2': {
      // S2: 2 papers per subject
      return subjectCount * 2;
    }
    case 'S3': {
      // S3: 3 papers per subject
      return subjectCount * 3;
    }
    case 'S4': {
      // S4: 6 papers per subject (1 full + 2 half + 3 thirty)
      return subjectCount * 6;
    }
    default:
      return 0;
  }
};

/**
 * Calculate price for a test series selection
 * 
 * Rules are STRICTLY enforced here.
 * 
 * @param {Object} params
 * @param {string} params.seriesType - 'S1' | 'S2' | 'S3' | 'S4'
 * @param {string[]} params.selectedSeries - Series selection for S1
 * @param {string[]} params.selectedSubjects - Selected subjects
 * @param {Object} params.pricing - Test series pricing config
 * @param {string} params.couponCode - Optional discount coupon
 * @param {Object} params.coupons - Available coupons
 * @returns {Object} { basePrice, discountAmount, finalPrice, totalPapers, appliedRule }
 */
export const calculatePrice = (params) => {
  const {
    seriesType,
    selectedSeries = [],
    selectedSubjects = [],
    pricing = {},
    couponCode = null,
    coupons = {},
  } = params;

  const subjectCount = selectedSubjects.length;
  const seriesCount = selectedSeries.length;
  let basePrice = 0;
  let appliedRule = '';

  // ============================================
  // S1 – Full Syllabus (Series-wise)
  // ============================================
  if (seriesType === 'S1') {
    // Rule 1: All 3 series + all 5 subjects → ₹6000 (OVERRIDE all)
    if (seriesCount === 3 && subjectCount === 5) {
      basePrice = pricing.allSeriesAllSubjectsPrice || 6000;
      appliedRule = 'S1: All 3 series + All 5 subjects';
    }
    // Rule 2: Single series, all 5 subjects → ₹2000
    else if (seriesCount >= 1 && subjectCount === 5) {
      basePrice = (pricing.allSubjectsPrice || 2000) * seriesCount;
      appliedRule = `S1: All 5 subjects × ${seriesCount} series`;
    }
    // Rule 3: Combo (≥3 subjects) → ₹400 per subject per series
    else if (subjectCount >= 3) {
      basePrice = 400 * subjectCount * seriesCount;
      appliedRule = `S1: Combo (${subjectCount} subjects) × ${seriesCount} series`;
    }
    // Rule 4: Individual subject → ₹450 per series
    else {
      basePrice = (pricing.subjectPrice || 450) * subjectCount * seriesCount;
      appliedRule = `S1: Individual subjects (${subjectCount}) × ${seriesCount} series`;
    }
  }
  // ============================================
  // S2 – 50% Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S2') {
    // Rule 1: All 5 subjects (Both group) → ₹2000
    if (subjectCount === 5) {
      basePrice = pricing.allSubjectsPrice || 2000;
      appliedRule = 'S2: All 5 subjects (10 papers)';
    }
    // Rule 2: Combo (≥3 subjects) → ₹400 per subject
    else if (subjectCount >= 3) {
      basePrice = 400 * subjectCount;
      appliedRule = `S2: Combo (${subjectCount} subjects, ${subjectCount * 2} papers)`;
    }
    // Rule 3: Individual subject → ₹450
    else {
      basePrice = (pricing.subjectPrice || 450) * subjectCount;
      appliedRule = `S2: Individual subjects (${subjectCount}, ${subjectCount * 2} papers)`;
    }
  }
  // ============================================
  // S3 – 30% Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S3') {
    // Rule 1: All 5 subjects (Both group) → ₹2000
    if (subjectCount === 5) {
      basePrice = pricing.allSubjectsPrice || 2000;
      appliedRule = 'S3: All 5 subjects (15 papers)';
    }
    // Rule 2: Combo (≥3 subjects) → ₹400 per subject
    else if (subjectCount >= 3) {
      basePrice = 400 * subjectCount;
      appliedRule = `S3: Combo (${subjectCount} subjects, ${subjectCount * 3} papers)`;
    }
    // Rule 3: Individual subject → ₹450
    else {
      basePrice = (pricing.subjectPrice || 450) * subjectCount;
      appliedRule = `S3: Individual subjects (${subjectCount}, ${subjectCount * 3} papers)`;
    }
  }
  // ============================================
  // S4 – CA Successful Specials (Group-wise)
  // ============================================
  else if (seriesType === 'S4') {
    // Rule 1: All 5 subjects → ₹6000 (30 papers)
    if (subjectCount === 5) {
      basePrice = 6000;
      appliedRule = 'S4: All 5 subjects (30 papers)';
    }
    // Rule 2: Combo (≥3 subjects) → ₹3600
    else if (subjectCount >= 3) {
      basePrice = 3600;
      appliedRule = `S4: Combo (${subjectCount} subjects, ${subjectCount * 6} papers)`;
    }
    // Rule 3: Individual subject → ₹1200 (6 papers)
    else {
      basePrice = (pricing.subjectPrice || 1200) * subjectCount;
      appliedRule = `S4: Individual subjects (${subjectCount}, ${subjectCount * 6} papers)`;
    }
  }

  // ============================================
  // Apply coupon discount
  // ============================================
  let discountAmount = 0;
  let couponUsed = null;

  if (couponCode && coupons[couponCode]) {
    const coupon = coupons[couponCode];
    if (coupon.type === 'flat') {
      discountAmount = Math.min(coupon.value, basePrice);
    } else if (coupon.type === 'percent') {
      discountAmount = Math.floor((basePrice * coupon.value) / 100);
    }
    couponUsed = couponCode;
  }

  const finalPrice = Math.max(0, basePrice - discountAmount);
  const totalPapers = calculatePaperCount(seriesType, selectedSeries, selectedSubjects);

  return {
    basePrice,
    discountAmount,
    finalPrice,
    totalPapers,
    appliedRule,
    couponUsed,
    breakdown: {
      seriesType,
      selectedSeriesCount: seriesCount,
      selectedSubjectsCount: subjectCount,
      papersPerSubject: getPapersPerSubject(seriesType),
      pricePerSubject: calculatePricePerSubject(seriesType, subjectCount),
    },
  };
};

/**
 * Get papers per subject for a series type
 * @param {string} seriesType
 * @returns {number}
 */
export const getPapersPerSubject = (seriesType) => {
  switch (seriesType) {
    case 'S1': return 1;
    case 'S2': return 2;
    case 'S3': return 3;
    case 'S4': return 6;
    default: return 0;
  }
};

/**
 * Calculate price per subject (for display purposes only)
 * @param {string} seriesType
 * @param {number} subjectCount
 * @returns {number}
 */
export const calculatePricePerSubject = (seriesType, subjectCount) => {
  if (subjectCount <= 0) return 0;

  switch (seriesType) {
    case 'S1':
      if (subjectCount >= 5) return 2000 / 5;
      if (subjectCount >= 3) return 400;
      return 450;
    case 'S2':
    case 'S3':
      if (subjectCount >= 5) return 2000 / 5;
      if (subjectCount >= 3) return 400;
      return 450;
    case 'S4':
      if (subjectCount >= 5) return 6000 / 5;
      if (subjectCount >= 3) return 3600 / subjectCount;
      return 1200;
    default:
      return 0;
  }
};

/**
 * Validate a test series selection
 * @param {string} seriesType
 * @param {string[]} selectedSeries
 * @param {string[]} selectedSubjects
 * @returns {Object} { isValid, errors }
 */
export const validateSelection = (seriesType, selectedSeries, selectedSubjects) => {
  const errors = [];

  // S1 requires series selection
  if (seriesType === 'S1' && (!selectedSeries || selectedSeries.length === 0)) {
    errors.push('Series selection is required for S1 Full Syllabus');
  }

  // All types require subject selection
  if (!selectedSubjects || selectedSubjects.length === 0) {
    errors.push('At least one subject must be selected');
  }

  // Validate series are within valid range for S1
  if (seriesType === 'S1' && selectedSeries) {
    const validSeries = ['series1', 'series2', 'series3'];
    const invalidSeries = selectedSeries.filter(s => !validSeries.includes(s));
    if (invalidSeries.length > 0) {
      errors.push(`Invalid series: ${invalidSeries.join(', ')}`);
    }
  }

  // S2, S3, S4 must not have series selection
  if (['S2', 'S3', 'S4'].includes(seriesType) && selectedSeries && selectedSeries.length > 0) {
    errors.push(`${seriesType} does not support series selection`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
