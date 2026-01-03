import type { PublicHoliday } from '../utils/types';

const API_BASE_URL = 'https://date.nager.at/api/v3';

const cache = new Map<string, { data: PublicHoliday[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const fetchPublicHolidays = async (
  year: number,
  countryCode: string
): Promise<PublicHoliday[]> => {
  const cacheKey = `${year}-${countryCode}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const allMatchYear = cached.data.every(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year;
    });
    if (allMatchYear) {
      return cached.data;
    }
    cache.delete(cacheKey);
  }
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/PublicHolidays/${year}/${countryCode}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }
    
    const data: PublicHoliday[] = await response.json();
    
    const validatedData = data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year;
    });
    
    cache.set(cacheKey, { data: validatedData, timestamp: Date.now() });
    
    return validatedData;
  } catch (error) {
    throw error;
  }
};

export const getAvailableCountries = async (): Promise<Array<{ countryCode: string; name: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/AvailableCountries`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return [
      { countryCode: 'US', name: 'United States' },
      { countryCode: 'GB', name: 'United Kingdom' },
      { countryCode: 'CA', name: 'Canada' },
      { countryCode: 'AU', name: 'Australia' },
    ];
  }
};

