import { useState, useEffect, useRef } from 'react';
import { fetchPublicHolidays } from '../services/holidayApi';
import type { PublicHoliday } from '../utils/types';

export interface MultiYearHolidaysResult {
  holidaysByYear: Map<number, PublicHoliday[]>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch holidays for multiple years
 * Returns a map of year -> holidays array
 */
export const useMultiYearHolidays = (
  years: number[],
  countryCode: string
): MultiYearHolidaysResult => {
  const [holidaysByYear, setHolidaysByYear] = useState<Map<number, PublicHoliday[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    if (!countryCode || !years || years.length === 0) {
      setHolidaysByYear(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const currentRequestId = ++requestIdRef.current;

    Promise.all(
      years.map(year =>
        fetchPublicHolidays(year, countryCode)
          .then(holidays => ({ year, holidays }))
          .catch(err => ({ year, holidays: [] as PublicHoliday[], error: err }))
      )
    )
      .then(results => {
        if (currentRequestId === requestIdRef.current) {
          const map = new Map<number, PublicHoliday[]>();
          let hasError = false;

          results.forEach(result => {
            if ('error' in result) {
              hasError = true;
            } else {
              map.set(result.year, result.holidays);
            }
          });

          setHolidaysByYear(map);
          setLoading(false);
          if (hasError) {
            setError('Some years failed to load');
          }
        }
      })
      .catch(err => {
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
          setLoading(false);
        }
      });
  }, [years.join(','), countryCode]);

  return { holidaysByYear, loading, error };
};
