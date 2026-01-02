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
  
  // Return cached data if still valid and matches the requested year
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Validate cached data matches the requested year
    const allMatchYear = cached.data.every(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year;
    });
    if (allMatchYear) {
      return cached.data;
    }
    // If cached data doesn't match year, clear it and fetch fresh
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
    
    // Validate that all holidays are from the requested year
    const validatedData = data.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year;
    });
    
    // Cache the validated result
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
    // Return some common countries as fallback
    return [
      { countryCode: 'US', name: 'United States' },
      { countryCode: 'GB', name: 'United Kingdom' },
      { countryCode: 'CA', name: 'Canada' },
      { countryCode: 'AU', name: 'Australia' },
    ];
  }
};

