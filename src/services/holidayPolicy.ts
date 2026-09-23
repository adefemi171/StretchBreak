import type { PublicHoliday } from '../utils/types';

export const HOLIDAY_POLICY_VERSION = '2026-09-22.2';
export const NIGERIA_EID_SOURCE = 'https://interior.gov.ng/federal-government-declares-thursday-19th-and-friday-20th-march-2026-as-public-holidays-to-mark-eid-ul-fitr/';
export const NIGERIA_ADHA_SOURCE = 'https://interior.gov.ng/federal-government-declares-wednesday-27th-may-and-thursday-28th-may-2026-as-public-holidays-to-mark-eid-ul-adha-celebration/';
export const NIGERIA_MAWLID_SOURCE = 'https://interior.gov.ng/fg-declares-tuesday-public-holiday-as-nation-marks-eid-ul-mawlid/';
export const UK_BANK_HOLIDAY_SOURCE = 'https://www.gov.uk/bank-holidays';

/** Date-only validation deliberately never interprets a local timezone. */
export const isValidHolidayDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const normalizeHolidayFeed = (data: unknown, year: number, countryCode: string): PublicHoliday[] => {
  if (!Array.isArray(data) || data.length > 1000) throw new Error('The holiday provider returned an unsupported data format.');
  return data.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('The holiday provider returned an invalid holiday.');
    const item = raw as Record<string, unknown>;
    if (!isValidHolidayDate(item.date) || !item.date.startsWith(`${year}-`) ||
        item.countryCode !== countryCode || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 500 ||
        typeof item.localName !== 'string' || item.localName.length > 500 || typeof item.global !== 'boolean' ||
        !Array.isArray(item.types) || !item.types.length || !item.types.every(t => typeof t === 'string' && t.length < 80) ||
        !(item.counties === null || (Array.isArray(item.counties) && item.counties.every(c => typeof c === 'string' && c.startsWith(`${countryCode}-`) && c.length < 30)))) {
      throw new Error('The holiday provider returned invalid dates or applicability data.');
    }
    return {
      date: item.date, localName: item.localName, name: item.name, countryCode,
      global: item.global, counties: item.counties === null ? null : [...item.counties] as string[],
      types: [...item.types] as string[], fixed: item.fixed === true,
      launchYear: typeof item.launchYear === 'number' && Number.isInteger(item.launchYear) ? item.launchYear : null,
    };
  });
};

/** Explicitly scoped official corrections; these do not certify an entire country calendar. */
export const applyVerifiedHolidayOverrides = (holidays: PublicHoliday[], year: number, countryCode: string): PublicHoliday[] => {
  if (countryCode === 'GB' && year === 2027) {
    // 2 January falls on Saturday: Scotland observes the government-listed substitute on Monday.
    // Match the named holiday and subdivision, so unrelated regional events are preserved.
    return holidays.map(h => h.date === '2027-01-02' && h.counties?.includes('GB-SCT') && /2 January/i.test(h.name)
      ? { ...h, date: '2027-01-04', sourceUrl: UK_BANK_HOLIDAY_SOURCE, verifiedOn: '2026-09-22' } : h);
  }
  if (countryCode !== 'NG' || year !== 2026) return holidays;
  const announcements = [
    { name: 'Eid-ul-Fitr', dates: ['2026-03-19', '2026-03-20'], sourceUrl: NIGERIA_EID_SOURCE, pattern: /eid[\s-]*(ul|al)?[\s-]*fitr|id[\s-]*(el|al)[\s-]*fitr/i },
    { name: 'Eid-ul-Adha', dates: ['2026-05-27', '2026-05-28'], sourceUrl: NIGERIA_ADHA_SOURCE, pattern: /eid[\s-]*(ul|al)?[\s-]*adha|id[\s-]*(el|al)[\s-]*kabir/i },
    { name: 'Eid-ul-Mawlid', dates: ['2026-08-25'], sourceUrl: NIGERIA_MAWLID_SOURCE, pattern: /mawlid|maulud|maulid/i },
  ];
  const overrides: PublicHoliday[] = announcements.flatMap(({ name, dates, sourceUrl }) => dates.map(date => ({
    date, name, localName: name, countryCode: 'NG', fixed: false,
    global: true, counties: null, launchYear: null, types: ['Public'],
    sourceUrl, verifiedOn: '2026-09-22',
  })));
  // Replace matching estimates, retaining unrelated holidays that share a date.
  const remaining = holidays.filter(h => !announcements.some(a => a.pattern.test(h.name + ' ' + h.localName)));
  return [...remaining, ...overrides].sort((a, b) => a.date.localeCompare(b.date));
};
