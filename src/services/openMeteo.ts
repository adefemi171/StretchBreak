/**
 * Client-side Open-Meteo integration (no API key, no backend).
 * Docs: https://open-meteo.com/
 */

export interface GeoLocation {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface MonthlyClimate {
  month: number; // 0-11
  avgTempC: number;
  avgPrecipMm: number;
  sampleDays: number;
}

export interface ClimateSummary {
  location: GeoLocation;
  months: MonthlyClimate[];
  source: 'open-meteo';
  fetchedAt: string;
}

export interface NearTermDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  weatherCode: number;
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CACHE_PREFIX = 'open-meteo-climate-';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Optional user city for climate/forecast (falls back to country capital). */
export const WEATHER_CITY_STORAGE_KEY = 'weather-preferred-city';
export const WEATHER_CITY_CHANGED_EVENT = 'stretchbreak-weather-city-changed';

export interface PreferredWeatherCity {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  admin1?: string;
}

/** Capitals / major cities for reliable planning climate (ISO → coords). */
const COUNTRY_COORDS: Record<string, { name: string; latitude: number; longitude: number }> = {
  NL: { name: 'Amsterdam', latitude: 52.37, longitude: 4.89 },
  BE: { name: 'Brussels', latitude: 50.85, longitude: 4.35 },
  DE: { name: 'Berlin', latitude: 52.52, longitude: 13.41 },
  FR: { name: 'Paris', latitude: 48.86, longitude: 2.35 },
  GB: { name: 'London', latitude: 51.51, longitude: -0.13 },
  IE: { name: 'Dublin', latitude: 53.35, longitude: -6.26 },
  ES: { name: 'Madrid', latitude: 40.42, longitude: -3.70 },
  PT: { name: 'Lisbon', latitude: 38.72, longitude: -9.14 },
  IT: { name: 'Rome', latitude: 41.90, longitude: 12.50 },
  CH: { name: 'Zurich', latitude: 47.38, longitude: 8.54 },
  AT: { name: 'Vienna', latitude: 48.21, longitude: 16.37 },
  SE: { name: 'Stockholm', latitude: 59.33, longitude: 18.07 },
  NO: { name: 'Oslo', latitude: 59.91, longitude: 10.75 },
  DK: { name: 'Copenhagen', latitude: 55.68, longitude: 12.57 },
  FI: { name: 'Helsinki', latitude: 60.17, longitude: 24.94 },
  PL: { name: 'Warsaw', latitude: 52.23, longitude: 21.01 },
  CZ: { name: 'Prague', latitude: 50.08, longitude: 14.44 },
  US: { name: 'Washington DC', latitude: 38.91, longitude: -77.04 },
  CA: { name: 'Ottawa', latitude: 45.42, longitude: -75.70 },
  MX: { name: 'Mexico City', latitude: 19.43, longitude: -99.13 },
  BR: { name: 'Brasília', latitude: -15.78, longitude: -47.93 },
  AR: { name: 'Buenos Aires', latitude: -34.60, longitude: -58.38 },
  CL: { name: 'Santiago', latitude: -33.45, longitude: -70.67 },
  AU: { name: 'Canberra', latitude: -35.28, longitude: 149.13 },
  NZ: { name: 'Wellington', latitude: -41.29, longitude: 174.78 },
  JP: { name: 'Tokyo', latitude: 35.68, longitude: 139.69 },
  KR: { name: 'Seoul', latitude: 37.57, longitude: 126.98 },
  CN: { name: 'Beijing', latitude: 39.90, longitude: 116.40 },
  IN: { name: 'New Delhi', latitude: 28.61, longitude: 77.21 },
  TH: { name: 'Bangkok', latitude: 13.76, longitude: 100.50 },
  SG: { name: 'Singapore', latitude: 1.35, longitude: 103.82 },
  MY: { name: 'Kuala Lumpur', latitude: 3.14, longitude: 101.69 },
  ID: { name: 'Jakarta', latitude: -6.21, longitude: 106.85 },
  PH: { name: 'Manila', latitude: 14.60, longitude: 120.98 },
  VN: { name: 'Hanoi', latitude: 21.03, longitude: 105.85 },
  ZA: { name: 'Pretoria', latitude: -25.75, longitude: 28.19 },
  AE: { name: 'Dubai', latitude: 25.20, longitude: 55.27 },
  TR: { name: 'Ankara', latitude: 39.93, longitude: 32.86 },
  GR: { name: 'Athens', latitude: 37.98, longitude: 23.73 },
  HU: { name: 'Budapest', latitude: 47.50, longitude: 19.04 },
  RO: { name: 'Bucharest', latitude: 44.43, longitude: 26.10 },
  HR: { name: 'Zagreb', latitude: 45.81, longitude: 15.98 },
  IS: { name: 'Reykjavik', latitude: 64.15, longitude: -21.94 },
  LU: { name: 'Luxembourg', latitude: 49.61, longitude: 6.13 },
};

const COUNTRY_NAMES: Record<string, string> = {
  NL: 'Netherlands',
  BE: 'Belgium',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IE: 'Ireland',
  ES: 'Spain',
  PT: 'Portugal',
  IT: 'Italy',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  CZ: 'Czech Republic',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  BR: 'Brazil',
  IN: 'India',
  TH: 'Thailand',
  ZA: 'South Africa',
};

interface CacheEntry {
  summary: ClimateSummary;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

const readCache = (key: string): ClimateSummary | null => {
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.summary;
  }
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (parsed.expiresAt > Date.now()) {
      memoryCache.set(key, parsed);
      return parsed.summary;
    }
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // ignore
  }
  return null;
};

const writeCache = (key: string, summary: ClimateSummary): void => {
  const entry: CacheEntry = {
    summary,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // quota — ignore
  }
};

export const getPreferredWeatherCity = (): PreferredWeatherCity | null => {
  try {
    const raw = localStorage.getItem(WEATHER_CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreferredWeatherCity;
    if (
      typeof parsed?.name === 'string' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.countryCode === 'string'
    ) {
      return { ...parsed, countryCode: parsed.countryCode.toUpperCase() };
    }
  } catch {
    // ignore
  }
  return null;
};

export const setPreferredWeatherCity = (city: PreferredWeatherCity | null): void => {
  try {
    if (!city) {
      localStorage.removeItem(WEATHER_CITY_STORAGE_KEY);
    } else {
      localStorage.setItem(
        WEATHER_CITY_STORAGE_KEY,
        JSON.stringify({ ...city, countryCode: city.countryCode.toUpperCase() })
      );
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WEATHER_CITY_CHANGED_EVENT));
  }
};

export interface GeocodeCityResult {
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  admin1?: string;
  country?: string;
}

/** Search cities via Open-Meteo geocoding (no API key). */
export const searchCities = async (
  query: string,
  options?: { countryCode?: string; count?: number }
): Promise<GeocodeCityResult[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    name: q,
    count: String(options?.count ?? 8),
    language: 'en',
    format: 'json',
  });
  if (options?.countryCode) {
    params.set('countryCode', options.countryCode.toUpperCase());
  }

  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results || []) as Array<{
      name: string;
      latitude: number;
      longitude: number;
      country_code?: string;
      admin1?: string;
      country?: string;
    }>;
    return results
      .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map(r => ({
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        countryCode: (r.country_code || options?.countryCode || '').toUpperCase(),
        admin1: r.admin1,
        country: r.country,
      }))
      .filter(r => r.countryCode.length === 2);
  } catch {
    return [];
  }
};

const resolveCapitalLocation = async (countryCode: string): Promise<GeoLocation | null> => {
  const code = countryCode.toUpperCase();
  const known = COUNTRY_COORDS[code];
  if (known) {
    return { countryCode: code, ...known };
  }

  const searchName = COUNTRY_NAMES[code] || code;
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(searchName)}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.results || []) as Array<{
      name: string;
      latitude: number;
      longitude: number;
      country_code?: string;
      feature_code?: string;
    }>;
    const match =
      results.find(r => (r.country_code || '').toUpperCase() === code) ||
      results.find(r => r.feature_code === 'PPLC') ||
      results[0];
    if (!match) return null;
    return {
      name: match.name,
      countryCode: code,
      latitude: match.latitude,
      longitude: match.longitude,
    };
  } catch {
    return null;
  }
};

/**
 * Prefer stored user city when it matches the selected country; otherwise capital.
 */
export const resolveLocation = async (countryCode: string): Promise<GeoLocation | null> => {
  const code = countryCode.toUpperCase();
  const preferred = getPreferredWeatherCity();
  if (preferred && preferred.countryCode === code) {
    return {
      name: preferred.admin1 ? `${preferred.name}, ${preferred.admin1}` : preferred.name,
      countryCode: code,
      latitude: preferred.latitude,
      longitude: preferred.longitude,
    };
  }
  return resolveCapitalLocation(code);
};

const climateCacheKey = (location: GeoLocation): string => {
  const lat = location.latitude.toFixed(2);
  const lon = location.longitude.toFixed(2);
  return `${location.countryCode}:${lat},${lon}`;
};

const aggregateMonthly = (
  times: string[],
  temps: Array<number | null>,
  precip: Array<number | null>
): MonthlyClimate[] => {
  const buckets = Array.from({ length: 12 }, () => ({
    tempSum: 0,
    precipSum: 0,
    tempCount: 0,
    precipCount: 0,
  }));

  for (let i = 0; i < times.length; i++) {
    const month = parseInt(times[i].slice(5, 7), 10) - 1;
    if (month < 0 || month > 11) continue;
    const t = temps[i];
    const p = precip[i];
    if (typeof t === 'number' && !Number.isNaN(t)) {
      buckets[month].tempSum += t;
      buckets[month].tempCount += 1;
    }
    if (typeof p === 'number' && !Number.isNaN(p)) {
      buckets[month].precipSum += p;
      buckets[month].precipCount += 1;
    }
  }

  return buckets.map((b, month) => ({
    month,
    avgTempC: b.tempCount ? Math.round((b.tempSum / b.tempCount) * 10) / 10 : 0,
    // average daily precip → approximate monthly total
    avgPrecipMm: b.precipCount
      ? Math.round((b.precipSum / b.precipCount) * 30 * 10) / 10
      : 0,
    sampleDays: b.tempCount,
  }));
};

/**
 * Fetch multi-year archive data and build monthly climate averages.
 * Soft-fails to null on network/API errors.
 */
export const fetchClimateSummary = async (countryCode: string): Promise<ClimateSummary | null> => {
  const code = countryCode.toUpperCase();
  const location = await resolveLocation(code);
  if (!location) return null;

  const cacheKey = climateCacheKey(location);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  // Recent complete years for a stable monthly profile
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 2;
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_mean,precipitation_sum',
    timezone: 'auto',
  });

  try {
    const res = await fetch(`${ARCHIVE_URL}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data.daily?.time || [];
    const temps: Array<number | null> = data.daily?.temperature_2m_mean || [];
    const precip: Array<number | null> = data.daily?.precipitation_sum || [];
    if (times.length === 0) return null;

    const summary: ClimateSummary = {
      location,
      months: aggregateMonthly(times, temps, precip),
      source: 'open-meteo',
      fetchedAt: new Date().toISOString(),
    };
    writeCache(cacheKey, summary);
    return summary;
  } catch {
    return null;
  }
};

/** Optional 14-day forecast for near-term planning tips. */
export const fetchNearTermForecast = async (
  countryCode: string
): Promise<{ location: GeoLocation; days: NearTermDay[] } | null> => {
  const location = await resolveLocation(countryCode);
  if (!location) return null;

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: '14',
    timezone: 'auto',
  });

  try {
    const res = await fetch(`${FORECAST_URL}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data.daily?.time || [];
    const days: NearTermDay[] = times.map((date, i) => ({
      date,
      tempMaxC: data.daily.temperature_2m_max?.[i] ?? 0,
      tempMinC: data.daily.temperature_2m_min?.[i] ?? 0,
      precipMm: data.daily.precipitation_sum?.[i] ?? 0,
      weatherCode: data.daily.weather_code?.[i] ?? 0,
    }));
    return { location, days };
  } catch {
    return null;
  }
};

export interface WeatherInsight {
  title: string;
  detail: string;
  relatedMonths: number[]; // 0-11
  score: number;
}

/**
 * Turn climate averages into travel-friendly weather insights.
 */
export const buildWeatherInsights = (summary: ClimateSummary): WeatherInsight[] => {
  const months = summary.months.filter(m => m.sampleDays > 0);
  if (months.length === 0) return [];

  const place = summary.location.name;
  const byComfort = [...months].sort((a, b) => {
    // Prefer mild temps (15–25°C) and lower rain
    const comfort = (m: MonthlyClimate) => {
      const tempScore = m.avgTempC >= 15 && m.avgTempC <= 25 ? 10 : m.avgTempC >= 10 && m.avgTempC <= 28 ? 6 : 2;
      const rainScore = m.avgPrecipMm < 40 ? 5 : m.avgPrecipMm < 80 ? 3 : 1;
      return tempScore + rainScore;
    };
    return comfort(b) - comfort(a);
  });

  const driest = [...months].sort((a, b) => a.avgPrecipMm - b.avgPrecipMm).slice(0, 3);
  const warmest = [...months].sort((a, b) => b.avgTempC - a.avgTempC).slice(0, 3);
  const mildest = byComfort.slice(0, 3);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (list: MonthlyClimate[]) =>
    list
      .map(m => `${monthNames[m.month]} (${m.avgTempC}°C, ~${Math.round(m.avgPrecipMm)}mm)`)
      .join('; ');

  const insights: WeatherInsight[] = [
    {
      title: `Mildest months in ${place}`,
      detail: `Based on Open-Meteo climate averages: ${fmt(mildest)}. Good windows for outdoor plans.`,
      relatedMonths: mildest.map(m => m.month),
      score: 10,
    },
    {
      title: `Driest stretch near ${place}`,
      detail: `Lowest typical rainfall: ${fmt(driest)}. Useful if you want fewer rain days.`,
      relatedMonths: driest.map(m => m.month),
      score: 8,
    },
    {
      title: `Warmest period near ${place}`,
      detail: `Highest average temperatures: ${fmt(warmest)}. Peak heat — plan accordingly.`,
      relatedMonths: warmest.map(m => m.month),
      score: 7,
    },
  ];

  return insights;
};
