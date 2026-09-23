import type { HolidayPlan, HolidaySourceMetadata, PublicHoliday, VacationStrategy, VacationTemplate } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;
const STRATEGIES: VacationStrategy[] = [
  'balanced',
  'long-weekends',
  'mini-breaks',
  'week-long',
  'extended',
];

const MAX_NAME_LEN = 120;
const MAX_DESCRIPTION_LEN = 500;
const MAX_VACATION_DAYS = 1830;
const MAX_HOLIDAYS = 1000;
const MAX_BACKUP_JSON_CHARS = 500_000;
const MAX_SHARE_PAYLOAD_CHARS = 200_000;

export const isSafeIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  if (/[\r\n\t\0]/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

export const sanitizePlainText = (value: unknown, maxLen: number): string => {
  if (typeof value !== 'string') return '';
  return Array.from(value).filter(character => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
  }).join('')
    .trim()
    .slice(0, maxLen);
};

const sanitizeDateList = (value: unknown, max: number): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value.slice(0, max)) {
    if (isSafeIsoDate(item) && !out.includes(item)) out.push(item);
  }
  return out;
};

const sanitizeHolidays = (value: unknown, countryCode: string): PublicHoliday[] => {
  if (!Array.isArray(value)) return [];
  const out: PublicHoliday[] = [];
  for (const raw of value.slice(0, MAX_HOLIDAYS)) {
    if (!raw || typeof raw !== 'object') continue;
    const h = raw as Record<string, unknown>;
    if (!isSafeIsoDate(h.date)) continue;
    const localName = sanitizePlainText(h.localName ?? h.name, 120);
    const name = sanitizePlainText(h.name ?? h.localName, 120);
    if (!localName && !name) continue;
    out.push({
      date: h.date,
      localName: localName || name,
      name: name || localName,
      countryCode:
        typeof h.countryCode === 'string' && COUNTRY_CODE_RE.test(h.countryCode.toUpperCase())
          ? h.countryCode.toUpperCase()
          : countryCode,
      fixed: Boolean(h.fixed),
      global: h.global !== false,
      counties: Array.isArray(h.counties) ? h.counties.filter((c): c is string => typeof c === 'string' && c.startsWith(`${countryCode}-`) && c.length <= 30) : null,
      sourceUrl: safeHttpsUrl(h.sourceUrl),
      verifiedOn: isSafeIsoDate(h.verifiedOn) ? h.verifiedOn : undefined,
      launchYear: null,
      types: Array.isArray(h.types)
        ? h.types.filter((t): t is string => typeof t === 'string').slice(0, 8)
        : ['Public'],
    });
  }
  return out;
};

const safeHttpsUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > 2000) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const boundedNumber = (value: unknown, max = 10000): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;

const sanitizeSource = (value: unknown): HolidaySourceMetadata | undefined => {
  if (!record(value)) return undefined;
  const sourceUrl = safeHttpsUrl(value.sourceUrl);
  if (value.provider !== 'Nager.Date' || !sourceUrl || value.coverage !== 'provider-unverified' ||
      !['fresh', 'stale', 'unknown'].includes(String(value.freshness))) return undefined;
  return {
    provider: 'Nager.Date', sourceUrl, coverage: 'provider-unverified',
    retrievedAt: typeof value.retrievedAt === 'string' && Number.isFinite(Date.parse(value.retrievedAt)) ? value.retrievedAt : '',
    freshness: value.freshness as HolidaySourceMetadata['freshness'],
    policyVersion: sanitizePlainText(value.policyVersion, 80),
    overrideSources: Array.isArray(value.overrideSources) ? value.overrideSources.map(safeHttpsUrl).filter((url): url is string => Boolean(url)).slice(0, 20) : [],
  };
};

const sanitizeStrategy = (value: unknown): VacationStrategy | undefined => {
  return typeof value === 'string' && (STRATEGIES as string[]).includes(value)
    ? (value as VacationStrategy)
    : undefined;
};

const sanitizeMonths = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const months = value
    .map((m) => Number(m))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .slice(0, 12);
  return months.length > 0 ? [...new Set(months)] : undefined;
};

export const validateSharedPlan = (raw: unknown): Partial<HolidayPlan> | null => {
  if (!raw || typeof raw !== 'object') return null;
  try {
    if (JSON.stringify(raw).length > MAX_SHARE_PAYLOAD_CHARS) return null;
  } catch {
    return null;
  }

  const plan = raw as Record<string, unknown>;
  const countryRaw = sanitizePlainText(plan.countryCode, 8).toUpperCase();
  if (!COUNTRY_CODE_RE.test(countryRaw)) return null;

  const year = Number(plan.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;

  if (!Array.isArray(plan.vacationDays) || plan.vacationDays.length > MAX_VACATION_DAYS) {
    return null;
  }
  // Reject any invalid/injected date rather than silently dropping it
  for (const day of plan.vacationDays) {
    if (!isSafeIsoDate(day)) return null;
  }
  const vacationDays = sanitizeDateList(plan.vacationDays, MAX_VACATION_DAYS);

  if (plan.publicHolidays !== undefined && !Array.isArray(plan.publicHolidays)) {
    return null;
  }
  if (Array.isArray(plan.publicHolidays)) {
    if (plan.publicHolidays.length > MAX_HOLIDAYS) return null;
    for (const h of plan.publicHolidays) {
      if (!h || typeof h !== 'object' || !isSafeIsoDate((h as { date?: unknown }).date)) {
        return null;
      }
    }
  }

  if (plan.workDays !== undefined && (!Array.isArray(plan.workDays) || !plan.workDays.length || plan.workDays.length > 7 || !plan.workDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6))) return null;
  if (plan.selectedRegions !== undefined && (!Array.isArray(plan.selectedRegions) || !plan.selectedRegions.every(region => typeof region === 'string' && region.startsWith(`${countryRaw}-`) && region.length <= 30))) return null;
  if (plan.excludedHolidayDates !== undefined && (!Array.isArray(plan.excludedHolidayDates) || !plan.excludedHolidayDates.every(isSafeIsoDate))) return null;
  let timeframe: HolidayPlan['timeframe'];
  if (plan.timeframe !== undefined) {
    if (!record(plan.timeframe)) return null;
    const frame = plan.timeframe;
    if (frame.type === 'calendar-year' && Number.isInteger(frame.year) && Number(frame.year) >= 2000 && Number(frame.year) <= 2100) {
      timeframe = { type: 'calendar-year', year: Number(frame.year) };
    } else if (frame.type === 'custom' && isSafeIsoDate(frame.startDate) && isSafeIsoDate(frame.endDate) && frame.startDate <= frame.endDate && Number(frame.endDate.slice(0, 4)) - Number(frame.startDate.slice(0, 4)) <= 5) {
      timeframe = { type: 'custom', startDate: frame.startDate, endDate: frame.endDate };
    } else return null;
  }
  if (plan.companyHolidays !== undefined && (!Array.isArray(plan.companyHolidays) || plan.companyHolidays.length > 1000 || !plan.companyHolidays.every(h => record(h) && isSafeIsoDate(h.date) && typeof h.name === 'string'))) return null;
  const companyHolidays = Array.isArray(plan.companyHolidays) ? plan.companyHolidays.map(h => ({
    id: sanitizePlainText(h.id, 64) || `company-${h.date}`, date: h.date as string,
    name: sanitizePlainText(h.name, 120), countryCode: typeof h.countryCode === 'string' && COUNTRY_CODE_RE.test(h.countryCode) ? h.countryCode : undefined,
  })) : undefined;

  return {
    companyHolidays,
    selectedRegions: plan.selectedRegions as string[] | undefined,
    workDays: plan.workDays ? [...new Set(plan.workDays as number[])] : undefined,
    excludedHolidayDates: plan.excludedHolidayDates ? sanitizeDateList(plan.excludedHolidayDates, MAX_HOLIDAYS) : undefined,
    timeframe,
    holidaySource: sanitizeSource(plan.holidaySource),
    name: sanitizePlainText(plan.name, MAX_NAME_LEN) || 'Shared Plan',
    description: sanitizePlainText(plan.description, MAX_DESCRIPTION_LEN) || undefined,
    countryCode: countryRaw,
    year,
    vacationDays,
    publicHolidays: sanitizeHolidays(plan.publicHolidays, countryRaw),
  };
};

export const validateSharedTemplate = (
  raw: unknown
): Omit<VacationTemplate, 'id' | 'isBuiltIn'> | null => {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  if (parsed.kind && parsed.kind !== 'stretchbreak-template') return null;

  const name = sanitizePlainText(parsed.name, MAX_NAME_LEN);
  if (!name) return null;

  const typical =
    typeof parsed.typicalDurationDays === 'number' &&
    Number.isFinite(parsed.typicalDurationDays) &&
    parsed.typicalDurationDays >= 1 &&
    parsed.typicalDurationDays <= 60
      ? Math.round(parsed.typicalDurationDays)
      : undefined;

  return {
    name,
    description: sanitizePlainText(parsed.description, MAX_DESCRIPTION_LEN) || undefined,
    strategy: sanitizeStrategy(parsed.strategy),
    preferredMonths: sanitizeMonths(parsed.preferredMonths),
    typicalDurationDays: typical,
  };
};

/** Sanitize known localStorage value shapes before restore. Returns null to skip the key. */
export const sanitizeBackupValue = (key: string, value: unknown): unknown | null => {
  if (key === 'webhook-url') {
    // Credentials never restored from backup/sync
    return null;
  }

  if (key === 'holiday-plans') {
    if (!Array.isArray(value) || value.length > 100) return null;
    const plans = value.map(raw => {
      if (!record(raw)) return null;
      const validated = validateSharedPlan(raw);
      const id = sanitizePlainText(raw.id, 64);
      if (!validated || !id) return null;
      const createdAt = typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt)) ? raw.createdAt : new Date().toISOString();
      return {
        ...validated, id, createdAt,
        updatedAt: typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : createdAt,
        strategy: sanitizeStrategy(raw.strategy),
        availablePTODays: boundedNumber(raw.availablePTODays, 365) ? raw.availablePTODays : undefined,
      };
    });
    return plans.every(Boolean) ? plans : null;
  }

  if (/^pto-carryover-\d{4}$/.test(key)) {
    if (!record(value) || !boundedNumber(value.days, 365) || !Number.isInteger(value.days) ||
      !Number.isInteger(value.expiryMonth) || Number(value.expiryMonth) < 1 || Number(value.expiryMonth) > 12 || value.year !== Number(key.slice(-4))) return null;
    return { days: value.days, expiryMonth: value.expiryMonth, year: value.year };
  }

  if (['stretchbreak-team', 'stretchbreak-wishlist', 'stretchbreak-plan-versions', 'stretchbreak_vacation_templates', 'vacation-budgets'].includes(key)) {
    if (!Array.isArray(value) || value.length > 1000) return null;
    const items = value.map(item => {
      if (!record(item) || !sanitizePlainText(item.id, 64)) return null;
      const id = sanitizePlainText(item.id, 64);
      if (key === 'stretchbreak-team') {
        if (typeof item.name !== 'string' || !Array.isArray(item.timeOff) || !item.timeOff.every(isSafeIsoDate)) return null;
        return { id, name: sanitizePlainText(item.name, 120), color: typeof item.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(item.color) ? item.color : undefined, timeOff: sanitizeDateList(item.timeOff, MAX_VACATION_DAYS) };
      }
      if (key === 'stretchbreak-plan-versions') {
        const snapshots = sanitizeBackupValue('holiday-plans', [item.snapshot]);
        if (!Array.isArray(snapshots) || !sanitizePlainText(item.planId, 64) || typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt))) return null;
        return { id, planId: sanitizePlainText(item.planId, 64), label: sanitizePlainText(item.label, 120), snapshot: snapshots[0], createdAt: item.createdAt };
      }
      if (key === 'stretchbreak_vacation_templates') {
        const template = validateSharedTemplate(item);
        return template ? { ...template, id } : null;
      }
      if (key === 'stretchbreak-wishlist') {
        if (typeof item.name !== 'string' || !boundedNumber(item.priority) ||
          (item.startDate !== undefined && !isSafeIsoDate(item.startDate)) || (item.endDate !== undefined && !isSafeIsoDate(item.endDate))) return null;
        return { id, name: sanitizePlainText(item.name, 120), priority: item.priority, startDate: item.startDate, endDate: item.endDate, preferredMonths: sanitizeMonths(item.preferredMonths), notes: sanitizePlainText(item.notes, 500) };
      }
      if (!isSafeIsoDate(item.startDate) || !isSafeIsoDate(item.endDate) || !['estimatedTravel', 'estimatedLodging', 'estimatedFood', 'estimatedOther'].every(field => boundedNumber(item[field], 100000000)) || typeof item.currency !== 'string' || !/^[A-Z]{3}$/.test(item.currency)) return null;
      return { id, planId: sanitizePlainText(item.planId, 64), periodLabel: sanitizePlainText(item.periodLabel, 120), startDate: item.startDate, endDate: item.endDate, estimatedTravel: item.estimatedTravel, estimatedLodging: item.estimatedLodging, estimatedFood: item.estimatedFood, estimatedOther: item.estimatedOther, currency: item.currency, peakSeasonMultiplier: boundedNumber(item.peakSeasonMultiplier, 100) ? item.peakSeasonMultiplier : undefined, createdAt: sanitizePlainText(item.createdAt, 40), updatedAt: sanitizePlainText(item.updatedAt, 40) };
    });
    return items.every(Boolean) ? items : null;
  }

  if (key === 'user-preferences') {
    if (!record(value) || !Array.isArray(value.preferredMonths) || !value.preferredMonths.every(m => Number.isInteger(m) && m >= 0 && m <= 11) || !boundedNumber(value.typicalDuration, 366) || !boundedNumber(value.efficiencyGoal, 100) || !Array.isArray(value.pastPlans) || !value.pastPlans.every(id => typeof id === 'string')) return null;
    return { preferredMonths: value.preferredMonths, typicalDuration: value.typicalDuration, efficiencyGoal: value.efficiencyGoal, pastPlans: value.pastPlans.map(id => sanitizePlainText(id, 64)).slice(0, 1000) };
  }
  if (key === 'reminder-settings') {
    if (!record(value) || typeof value.enabled !== 'boolean' || !Array.isArray(value.daysBeforeVacation) || !value.daysBeforeVacation.every(n => boundedNumber(n, 366))) return null;
    return { enabled: value.enabled, daysBeforeVacation: value.daysBeforeVacation.slice(0, 20), ptoRequestDeadlineDays: boundedNumber(value.ptoRequestDeadlineDays, 366) ? value.ptoRequestDeadlineDays : undefined, bookingWindowDays: boundedNumber(value.bookingWindowDays, 366) ? value.bookingWindowDays : undefined };
  }
  if (key === 'weather-preferred-city') {
    if (!record(value) || typeof value.name !== 'string' || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180 || typeof value.countryCode !== 'string' || !COUNTRY_CODE_RE.test(value.countryCode)) return null;
    return { name: sanitizePlainText(value.name, 120), latitude: value.latitude, longitude: value.longitude, countryCode: value.countryCode, admin1: sanitizePlainText(value.admin1, 120) || undefined };
  }
  if (key === 'reminder-last-check') return isSafeIsoDate(value) ? value : null;
  if (key === 'accessibility-contrast') return ['normal', 'high'].includes(String(value)) ? value : null;
  if (key === 'accessibility-font-scale') return ['normal', 'large', 'x-large'].includes(String(value)) ? value : null;
  if (key === 'stretchbreak-public-calendar') return typeof value === 'boolean' || value === 'true' || value === 'false' ? value : null;

  if (key === 'lastCountryCode') return typeof value === 'string' && COUNTRY_CODE_RE.test(value) ? value : null;
  if (key === 'theme-preference') return ['light', 'dark', 'system'].includes(String(value)) ? value : null;

  if (
    key === 'total-pto-days' ||
    key === 'initial-pto-days' ||
    key === 'available-pto-input' ||
    key === 'pto-carryover-days' ||
    key === 'pto-carryover-expiry-month' ||
    key.startsWith('total-pto-days-')
  ) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(365, n));
  }

  // Bound opaque JSON blobs
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (serialized.length > 200_000) return null;
  } catch {
    return null;
  }

  return value;
};

export const assertBackupSize = (raw: string): void => {
  if (raw.length > MAX_BACKUP_JSON_CHARS) {
    throw new Error('Backup file is too large');
  }
};

export { MAX_BACKUP_JSON_CHARS };
