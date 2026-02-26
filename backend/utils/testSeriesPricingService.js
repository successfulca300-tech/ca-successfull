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
export const calculatePaperCount = (seriesType, selectedSeries = [], selectedSubjects = [], pricing = {}) => {
  const subjectCount = selectedSubjects.length;
  if (!subjectCount) return 0;

  // if pricing object provides explicit papersPerSubject counts we should honour those
  if (pricing.papersPerSubject) {
    let total = 0;
    selectedSubjects.forEach((sub) => {
      total += pricing.papersPerSubject[sub] || getPapersPerSubject(seriesType);
    });
    if (seriesType === 'S1') {
      // multiply by number of series configured or selected
      const mult = pricing.seriesCount || Math.max(1, selectedSeries.length);
      total *= mult;
    }
    return total;
  }

  // fallback to legacy rules when no explicit config available
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

  // derive base per-subject price from config if available (default to 450)
  const subjectPrice = pricing.subjectPrice || 450;

  // series count is relevant only for S1; allow override via pricing config (useful for CA Inter)
  const seriesMultiplier = seriesType === 'S1'
    ? (pricing.seriesCount || Math.max(1, seriesCount))
    : 1;

  // ============================================
  // S1 – Full Syllabus (Series-wise)
  // ============================================
  if (seriesType === 'S1') {
    // simply charge subjectPrice for each selected subject, times number of series selected
    basePrice = subjectPrice * subjectCount * seriesMultiplier;
    appliedRule = `S1: ${subjectCount} subjects @ ₹${subjectPrice} × ${seriesMultiplier} series`;
  }
  // ============================================
  // S2 – 50% Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S2') {
    basePrice = subjectPrice * subjectCount;
    appliedRule = `S2: ${subjectCount} subjects @ ₹${subjectPrice}`;
  }
  // ============================================
  // S3 – 30%/Chapterwise Syllabus (Group-wise, NO series)
  // ============================================
  else if (seriesType === 'S3') {
    basePrice = subjectPrice * subjectCount;
    appliedRule = `S3: ${subjectCount} subjects @ ₹${subjectPrice}`;
  }
  // ============================================
  // S4 – CA Successful Specials (Group-wise)
  // ============================================
  else if (seriesType === 'S4') {
    // Use pricing config when available (keep CA Final and CA Inter separate via pricing values)
    const totalAvailableSubjects = pricing.papersPerSubject ? Object.keys(pricing.papersPerSubject).length : null;
    if (pricing.comboPrice && subjectCount === 3) {
      basePrice = pricing.comboPrice;
      appliedRule = `S4: Combo (${subjectCount} subjects, ${subjectCount * 6} papers)`;
    } else if (pricing.allSubjectsPrice && totalAvailableSubjects && subjectCount === totalAvailableSubjects) {
      basePrice = pricing.allSubjectsPrice;
      appliedRule = `S4: All ${subjectCount} subjects (${totalAvailableSubjects * 6} papers)`;
    } else {
      basePrice = (pricing.subjectPrice || 1200) * subjectCount;
      appliedRule = `S4: Individual subjects (${subjectCount}, ${subjectCount * 6} papers)`;
    }
  }

  // ============================================
  // Apply coupon discount (allow for any non-zero selection)
  // ============================================
  let discountAmount = 0;
  let couponUsed = null;
  const totalPapers = calculatePaperCount(seriesType, selectedSeries, selectedSubjects, pricing);

  // Allow coupons for any positive selection (single subject / single paper included)
  const isEligibleForCoupon = totalPapers > 0;
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

  // calculate papers per subject for breakdown (average or config-based)
  let papersPerSub = 0;
  if (subjectCount > 0) {
    papersPerSub = Math.floor(totalPapers / subjectCount);
  }

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
      papersPerSubject: papersPerSub,
      pricePerSubject: pricing.subjectPrice
        ? seriesType === 'S1'
          ? pricing.subjectPrice * seriesMultiplier
          : pricing.subjectPrice
        : calculatePricePerSubject(seriesType, subjectCount),
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
