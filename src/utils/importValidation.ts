import type { HolidayPlan, PublicHoliday, VacationStrategy, VacationTemplate } from './types';

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
const MAX_VACATION_DAYS = 366;
const MAX_HOLIDAYS = 200;
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
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
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
      counties: null,
      launchYear: null,
      types: Array.isArray(h.types)
        ? h.types.filter((t): t is string => typeof t === 'string').slice(0, 8)
        : ['Public'],
    });
  }
  return out;
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

  return {
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
    if (!Array.isArray(value)) return null;
    return value
      .slice(0, 100)
      .map((rawPlan) => {
        const plan = rawPlan as Partial<HolidayPlan>;
        const validated = validateSharedPlan(plan);
        if (!validated) return null;
        const id =
          typeof plan.id === 'string' ? sanitizePlainText(plan.id, 64) : `imported-${Date.now()}`;
        const createdRaw = plan.createdAt;
        const createdAt =
          typeof createdRaw === 'string' &&
          createdRaw.length <= 40 &&
          !Number.isNaN(Date.parse(createdRaw))
            ? createdRaw
            : new Date().toISOString();
        const availablePTODays =
          typeof plan.availablePTODays === 'number' && Number.isFinite(plan.availablePTODays)
            ? Math.max(0, Math.min(365, plan.availablePTODays))
            : undefined;
        const companyHolidays = Array.isArray(plan.companyHolidays)
          ? plan.companyHolidays
              .slice(0, 100)
              .map((h) => {
                if (!h || typeof h !== 'object' || !isSafeIsoDate(h.date)) return null;
                return {
                  id: sanitizePlainText(h.id, 64) || `ch-${h.date}`,
                  date: h.date,
                  name: sanitizePlainText(h.name, 120) || 'Company holiday',
                  countryCode:
                    typeof h.countryCode === 'string' && COUNTRY_CODE_RE.test(h.countryCode.toUpperCase())
                      ? h.countryCode.toUpperCase()
                      : undefined,
                };
              })
              .filter(Boolean)
          : undefined;
        return {
          ...validated,
          id: id || `imported-${Date.now()}`,
          strategy: sanitizeStrategy(plan.strategy),
          availablePTODays,
          companyHolidays: companyHolidays?.length ? companyHolidays : undefined,
          createdAt,
          updatedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean);
  }

  if (key === 'lastCountryCode' || key === 'theme-preference') {
    const text = sanitizePlainText(value, 32);
    return text || null;
  }

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
