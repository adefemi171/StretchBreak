import { useState, useEffect } from 'react';
import { fetchPublicHolidays } from '../services/holidayApi';
import type { PublicHoliday } from '../utils/types';

export const useHolidays = (year: number, countryCode: string) => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!countryCode || !year) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    fetchPublicHolidays(year, countryCode)
      .then(data => {
        setHolidays(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
        setLoading(false);
      });
  }, [year, countryCode]);
  
  return { holidays, loading, error };
};

