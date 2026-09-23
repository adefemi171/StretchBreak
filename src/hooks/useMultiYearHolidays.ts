import { useState, useEffect } from 'react';
import { fetchHolidayDataset } from '../services/holidayApi';
import type { HolidaySourceMetadata, PublicHoliday } from '../utils/types';

export interface MultiYearHolidaysResult {
  holidaysByYear: Map<number, PublicHoliday[]>;
  metadataByYear: Map<number, HolidaySourceMetadata>;
  loading: boolean;
  error: string | null;
}

export const useMultiYearHolidays = (years: number[], countryCode: string): MultiYearHolidaysResult => {
  const yearsKey = [...new Set(years)].sort((a, b) => a - b).join(',');
  const requestKey = `${countryCode}:${yearsKey}`;
  const [result, setResult] = useState<MultiYearHolidaysResult & { requestKey: string }>({
    requestKey: '', holidaysByYear: new Map(), metadataByYear: new Map(), loading: false, error: null,
  });

  useEffect(() => {
    let active = true;
    if (!countryCode || !yearsKey) return;
    Promise.all(yearsKey.split(',').map(Number).map(async year => {
      try {
        return { year, dataset: await fetchHolidayDataset(year, countryCode) };
      } catch (error) {
        return { year, error: error instanceof Error ? error.message : `Unable to load ${year} holidays.` };
      }
    })).then(results => {
      if (!active) return;
      const holidaysByYear = new Map<number, PublicHoliday[]>();
      const metadataByYear = new Map<number, HolidaySourceMetadata>();
      const errors: string[] = [];
      results.forEach(result => {
        if (result.dataset) {
          holidaysByYear.set(result.year, result.dataset.holidays);
          metadataByYear.set(result.year, result.dataset.metadata);
        } else if (result.error) errors.push(result.error);
      });
      setResult({ requestKey, holidaysByYear, metadataByYear, loading: false, error: errors.length ? errors.join(' ') : null });
    });
    return () => { active = false; };
  }, [yearsKey, countryCode, requestKey]);

  // Never expose a previous country's holidays while its replacement is loading.
  if (result.requestKey !== requestKey || !countryCode || !yearsKey) {
    return { holidaysByYear: new Map(), metadataByYear: new Map(), loading: Boolean(countryCode && yearsKey), error: null };
  }
  return result;
};
