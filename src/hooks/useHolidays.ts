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
      // Clear holidays if invalid params
      setHolidays([]);
      setLoading(false);
      return;
    }
    
    // Clear holidays immediately when country/year changes
    setHolidays([]);
    setLoading(true);
    setError(null);
    
    // Increment request ID to track the current request
    const currentRequestId = ++requestIdRef.current;
    
    fetchPublicHolidays(year, countryCode)
      .then(data => {
        // Only update if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setHolidays(data);
          setLoading(false);
        }
      })
      .catch(err => {
        // Only update if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
          setLoading(false);
        }
      });
  }, [year, countryCode]);
  
  return { holidays, loading, error };
};

