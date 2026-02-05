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

  // New per-subject price mapping requested by product
  const perSubjectTotalMap = {
    1: 450,
    2: 900,
    3: 1350,
    4: 1800,
    5: 2250, // special cap for 5 subjects
  };

  // ============================================
  // S1 – Full Syllabus (Series-wise)
  // ============================================
  if (seriesType === 'S1') {
    // Use new per-subject total mapping, multiplied by selected series count
    const perSubjectTotal = perSubjectTotalMap[Math.min(subjectCount, 5)] || (450 * subjectCount);
    basePrice = perSubjectTotal * Math.max(1, seriesCount);
    appliedRule = `S1: ${subjectCount} subjects mapped total ${perSubjectTotal} × ${Math.max(1, seriesCount)} series`;
  }
  // ============================================
  // S2 – 50% Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S2') {
    // Use new per-subject total mapping (no series multiplier for S2)
    basePrice = perSubjectTotalMap[Math.min(subjectCount, 5)] || (450 * subjectCount);
    appliedRule = `S2: ${subjectCount} subjects mapped total ${basePrice}`;
  }
  // ============================================
  // S3 – 30% Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S3') {
    // Use new per-subject total mapping (no series multiplier for S3)
    basePrice = perSubjectTotalMap[Math.min(subjectCount, 5)] || (450 * subjectCount);
    appliedRule = `S3: ${subjectCount} subjects mapped total ${basePrice}`;
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
    // Rule 2: Combo (exactly 3 subjects) → ₹3600
    else if (subjectCount === 3) {
      basePrice = 3600;
      appliedRule = `S4: Combo (${subjectCount} subjects, ${subjectCount * 6} papers)`;
    }
    // Rule 3: Individual subjects (per-subject ₹1200)
    else {
      basePrice = (pricing.subjectPrice || 1200) * subjectCount;
      appliedRule = `S4: Individual subjects (${subjectCount}, ${subjectCount * 6} papers)`;
    }
  }

  // ============================================
  // Apply coupon discount (only if total papers > 2)
  // ============================================
  let discountAmount = 0;
  let couponUsed = null;
  const totalPapers = calculatePaperCount(seriesType, selectedSeries, selectedSubjects);

  const isEligibleForCoupon =
    seriesType === 'S1'
      ? totalPapers > 2
      : seriesType === 'S2' || seriesType === 'S3'
        ? subjectCount > 2
        : seriesType === 'S4'
          ? true
          : false;
  if (couponCode && coupons[couponCode] && isEligibleForCoupon) {
    const coupon = coupons[couponCode];
    if (coupon.type === 'flat') {
      discountAmount = Math.min(coupon.value, basePrice);
    } else if (coupon.type === 'percent') {
      const percentToApply = seriesType === 'S4' ? Math.min(coupon.value, 16) : coupon.value;
      discountAmount = Math.floor((basePrice * percentToApply) / 100);
    }
    couponUsed = couponCode;
  }

  const finalPrice = Math.max(0, basePrice - discountAmount);

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

  // Use the same per-subject TOTAL mapping as calculatePrice for S1/S2/S3
  const perSubjectTotalMap = {
    1: 450,
    2: 900,
    3: 1350,
    4: 1800,
    5: 2250,
  };

  switch (seriesType) {
    case 'S1':
    case 'S2':
    case 'S3': {
      const total = perSubjectTotalMap[Math.min(subjectCount, 5)] || (450 * subjectCount);
      return Math.floor(total / Math.max(1, subjectCount));
    }
    case 'S4':
      if (subjectCount === 5) return 6000 / 5;
      if (subjectCount === 3) return 3600 / 3;
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
    errors.push('Series selection is required for Full Syllabus');
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
