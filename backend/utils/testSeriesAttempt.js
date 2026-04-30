const ATTEMPT_CALENDAR = Object.freeze({
  final: Object.freeze([
    { label: 'May', monthIndex: 4 },
    { label: 'Nov', monthIndex: 10 },
  ]),
  inter: Object.freeze([
    { label: 'Jan', monthIndex: 0 },
    { label: 'May', monthIndex: 4 },
    { label: 'Sept', monthIndex: 8 },
  ]),
});

const ATTEMPT_ALIASES = Object.freeze({
  jan: 'Jan',
  january: 'Jan',
  may: 'May',
  sep: 'Sept',
  sept: 'Sept',
  september: 'Sept',
  nov: 'Nov',
  november: 'Nov',
});

const ATTEMPT_MESSAGE_LABELS = Object.freeze({
  final: 'May YYYY, Nov YYYY',
  inter: 'Jan YYYY, May YYYY, Sept YYYY',
});

const getPurchaseCutoff = (year, monthIndex) => (
  new Date(year, monthIndex, 1 - 5, 0, 0, 0, 0)
);

const getAccessExpiry = (year, monthIndex) => (
  new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) - 1)
);

export const normalizeExamLevel = (value) => (
  String(value || '').trim().toLowerCase() === 'inter' ? 'inter' : 'final'
);

export const getAllowedTestSeriesAttempts = (examLevel, now = new Date()) => {
  const normalizedLevel = normalizeExamLevel(examLevel);
  const definitions = ATTEMPT_CALENDAR[normalizedLevel];
  const requiredCount = normalizedLevel === 'inter' ? 3 : 2;
  const attempts = [];
  const currentYear = now.getFullYear();

  for (let year = currentYear; attempts.length < requiredCount && year <= currentYear + 5; year += 1) {
    for (const definition of definitions) {
      if (attempts.length >= requiredCount) break;
      const purchaseCutoff = getPurchaseCutoff(year, definition.monthIndex);
      if (purchaseCutoff.getTime() <= now.getTime()) continue;
      attempts.push(`${definition.label} ${year}`);
    }
  }

  return attempts;
};

export const getAttemptSelectionHint = (examLevel) => (
  ATTEMPT_MESSAGE_LABELS[normalizeExamLevel(examLevel)]
);

export const isAttemptAllowedForExamLevel = (attemptValue, examLevel) => {
  const normalizedAttempt = normalizeTestSeriesAttempt(attemptValue);
  if (!normalizedAttempt) return false;

  const [monthLabel] = normalizedAttempt.split(' ');
  return ATTEMPT_CALENDAR[normalizeExamLevel(examLevel)].some((entry) => entry.label === monthLabel);
};

export const normalizeTestSeriesAttempt = (value) => {
  const normalized = String(value || '')
    .trim()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!normalized) return null;

  const match = normalized.match(/^([a-z]+)\s+(\d{4}|\d{2})$/);
  if (!match) return null;

  const [, rawMonth, rawYear] = match;
  const month = ATTEMPT_ALIASES[rawMonth];
  if (!month) return null;

  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${month} ${year}`;
};

export const getAttemptExpiryDate = (attemptValue, options = {}) => {
  const attempt = normalizeTestSeriesAttempt(attemptValue);
  if (!attempt) return null;

  const [monthLabel, yearString] = attempt.split(' ');
  const year = Number(yearString);
  const normalizedLevel = normalizeExamLevel(options?.examLevel || null);
  const monthMeta = ATTEMPT_CALENDAR[normalizedLevel].find((entry) => entry.label === monthLabel)
    || ATTEMPT_CALENDAR.final.find((entry) => entry.label === monthLabel)
    || ATTEMPT_CALENDAR.inter.find((entry) => entry.label === monthLabel);

  if (!Number.isFinite(year) || !monthMeta) return null;

  return getAccessExpiry(year, monthMeta.monthIndex);
};

export const isAttemptExpired = (expiryDate, now = new Date()) => {
  if (!expiryDate) return false;
  const parsedExpiry = new Date(expiryDate);
  if (Number.isNaN(parsedExpiry.getTime())) return false;
  return now.getTime() > parsedExpiry.getTime();
};

export const isTestSeriesEnrollmentExpired = (enrollment, now = new Date()) => {
  if (!enrollment || !enrollment.testSeriesId) return false;
  const derivedExpiry = enrollment.testSeriesAttempt
    ? getAttemptExpiryDate(enrollment.testSeriesAttempt)
    : null;
  return isAttemptExpired(derivedExpiry || enrollment.expiryDate, now);
};

export const isTestSeriesEnrollmentActive = (enrollment, now = new Date()) => {
  if (!enrollment || !enrollment.testSeriesId) return false;
  if (enrollment.paymentStatus !== 'paid') return false;

  const derivedExpiry = enrollment.testSeriesAttempt
    ? getAttemptExpiryDate(enrollment.testSeriesAttempt)
    : null;
  if (!derivedExpiry && !enrollment.expiryDate) return true;

  return !isAttemptExpired(derivedExpiry || enrollment.expiryDate, now);
};
