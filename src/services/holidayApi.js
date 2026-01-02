const API_BASE_URL = 'https://date.nager.at/api/v3';
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
export const fetchPublicHolidays = async (year, countryCode) => {
    const cacheKey = `${year}-${countryCode}`;
    const cached = cache.get(cacheKey);
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/PublicHolidays/${year}/${countryCode}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch holidays: ${response.statusText}`);
        }
        const data = await response.json();
        // Cache the result
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }
    catch (error) {
        console.error('Error fetching public holidays:', error);
        throw error;
    }
};
export const getAvailableCountries = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/AvailableCountries`);
        if (!response.ok) {
            throw new Error(`Failed to fetch countries: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error fetching countries:', error);
        // Return some common countries as fallback
        return [
            { countryCode: 'US', name: 'United States' },
            { countryCode: 'GB', name: 'United Kingdom' },
            { countryCode: 'CA', name: 'Canada' },
            { countryCode: 'AU', name: 'Australia' },
        ];
    }
};
