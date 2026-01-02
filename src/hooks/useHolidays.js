import { useState, useEffect } from 'react';
import { fetchPublicHolidays } from '../services/holidayApi';
export const useHolidays = (year, countryCode) => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
