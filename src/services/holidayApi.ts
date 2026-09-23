import type { HolidaySourceMetadata, PublicHoliday } from '../utils/types';
import { applyVerifiedHolidayOverrides, HOLIDAY_POLICY_VERSION, normalizeHolidayFeed } from './holidayPolicy';

const API_BASE_URL = 'https://date.nager.at/api/v3';
const CACHE_DURATION = 1000 * 60 * 60;
export interface HolidayDataset {
  holidays: PublicHoliday[];
  metadata: HolidaySourceMetadata;
}
const cache = new Map<string, { dataset: HolidayDataset; timestamp: number }>();

export const fetchHolidayDataset = async (year: number, country: string): Promise<HolidayDataset> => {
  const countryCode = country.toUpperCase();
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('Choose a valid country and year between 1900 and 2200.');
  }
  const cacheKey = `${year}-${countryCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && cached.dataset.metadata.freshness === 'fresh') {
    return structuredClone(cached.dataset);
  }
  const sourceUrl = `${API_BASE_URL}/PublicHolidays/${year}/${countryCode}`;
  const response = await fetch(sourceUrl);
  if (response.status === 204 || response.status === 404) {
    throw new Error(`Holiday coverage is unavailable for ${countryCode} in ${year}. Add confirmed employer holidays manually.`);
  }
  if (!response.ok) throw new Error(`Unable to load holidays for ${countryCode} in ${year} (${response.status}).`);
  const holidays = applyVerifiedHolidayOverrides(normalizeHolidayFeed(await response.json(), year, countryCode), year, countryCode);
  // The service worker annotates cached responses; never label offline data as newly verified.
  const offline = response.headers.get('x-stretchbreak-offline') === 'true' || (typeof navigator !== 'undefined' && !navigator.onLine);
  const rawFetchedAt = response.headers.get('x-stretchbreak-fetched-at');
  const validFetchedAt = rawFetchedAt && Number.isFinite(Date.parse(rawFetchedAt)) ? rawFetchedAt : undefined;
  const retrievedAt = validFetchedAt || (offline ? '' : new Date().toISOString());
  const stale = offline || (retrievedAt && Date.now() - Date.parse(retrievedAt) > CACHE_DURATION);
  const metadata: HolidaySourceMetadata = {
    provider: 'Nager.Date', sourceUrl, retrievedAt,
    freshness: !retrievedAt ? 'unknown' : stale ? 'stale' : 'fresh',
    coverage: 'provider-unverified', policyVersion: HOLIDAY_POLICY_VERSION,
    overrideSources: [...new Set(holidays.flatMap(h => h.sourceUrl ? [h.sourceUrl] : []))],
  };
  const dataset = { holidays, metadata };
  cache.set(cacheKey, { dataset, timestamp: Date.now() });
  return structuredClone(dataset);
};

export const fetchPublicHolidays = async (year: number, countryCode: string): Promise<PublicHoliday[]> =>
  (await fetchHolidayDataset(year, countryCode)).holidays;

export const getAvailableCountries = async (): Promise<Array<{ countryCode: string; name: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/AvailableCountries`);
    if (!response.ok) throw new Error('Unable to load country coverage.');
    const countries: unknown = await response.json();
    if (!Array.isArray(countries) || !countries.every(c => c && typeof c.countryCode === 'string' && /^[A-Z]{2}$/.test(c.countryCode) && typeof c.name === 'string')) {
      throw new Error('Invalid country coverage response.');
    }
    return countries.map(c => ({ countryCode: c.countryCode, name: c.name }));
  } catch {
    return [
      { countryCode: 'US', name: 'United States' },
      { countryCode: 'GB', name: 'United Kingdom' },
      { countryCode: 'CA', name: 'Canada' },
      { countryCode: 'AU', name: 'Australia' },
    ];
  }
};
