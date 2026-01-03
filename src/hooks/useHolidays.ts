import { useState, useEffect, useRef } from 'react';
import { fetchPublicHolidays } from '../services/holidayApi';
import type { PublicHoliday } from '../utils/types';

export const useHolidays = (year: number, countryCode: string) => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);
  
  useEffect(() => {
    if (!countryCode || !year) {
      setHolidays([]);
      setLoading(false);
      return;
    }
    
    setHolidays([]);
    setLoading(true);
    setError(null);
    
    const currentRequestId = ++requestIdRef.current;
    
    fetchPublicHolidays(year, countryCode)
      .then(data => {
        if (currentRequestId === requestIdRef.current) {
          setHolidays(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
          setLoading(false);
        }
      });
  }, [year, countryCode]);
  
  return { holidays, loading, error };
};

