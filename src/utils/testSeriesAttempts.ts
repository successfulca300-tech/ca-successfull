type ExamLevel = 'inter' | 'final';

type AttemptDefinition = {
  label: string;
  monthIndex: number;
};

const ATTEMPT_CALENDAR: Record<ExamLevel, AttemptDefinition[]> = {
  final: [
    { label: 'May', monthIndex: 4 },
    { label: 'Nov', monthIndex: 10 },
  ],
  inter: [
    { label: 'Jan', monthIndex: 0 },
    { label: 'May', monthIndex: 4 },
    { label: 'Sept', monthIndex: 8 },
  ],
};

const ATTEMPT_ALIASES: Record<string, string> = {
  jan: 'Jan',
  january: 'Jan',
  may: 'May',
  sep: 'Sept',
  sept: 'Sept',
  september: 'Sept',
  nov: 'Nov',
  november: 'Nov',
};

const getMonthEnd = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

const getPurchaseCutoff = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1 - 5, 0, 0, 0, 0);

const getAccessExpiry = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1, 0, 0, 0, -1);

export const normalizeExamLevel = (value?: string | null): ExamLevel =>
  String(value || '').trim().toLowerCase() === 'inter' ? 'inter' : 'final';

export const getUpcomingAttempts = (examLevelInput?: string | null, now = new Date()) => {
  const examLevel = normalizeExamLevel(examLevelInput);
  const definitions = ATTEMPT_CALENDAR[examLevel];
  const requiredCount = examLevel === 'inter' ? 3 : 2;
  const attempts: string[] = [];
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

export const normalizeAttemptLabel = (value?: string | null) => {
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

export const getAttemptExpiryDate = (attempt: string) => {
  const normalized = normalizeAttemptLabel(attempt);
  if (!normalized) return null;

  const [monthLabel, yearString] = normalized.split(' ');
  const year = Number(yearString);
  const monthIndex = [...ATTEMPT_CALENDAR.final, ...ATTEMPT_CALENDAR.inter].find(
    (item) => item.label === monthLabel
  )?.monthIndex;

  if (!Number.isFinite(year) || monthIndex === undefined) return null;
  return getAccessExpiry(year, monthIndex);
};
