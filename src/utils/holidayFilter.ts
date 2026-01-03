import type { PublicHoliday } from './types';

export const filterHolidaysByRegions = (
  holidays: PublicHoliday[],
  selectedRegions: string[]
): PublicHoliday[] => {
  if (!selectedRegions || selectedRegions.length === 0) {
    return holidays;
  }
  
  return holidays.filter(holiday => {
    if (holiday.global) {
      return true;
    }
    
    if (holiday.counties && holiday.counties.length > 0) {
      return holiday.counties.some(county => selectedRegions.includes(county));
    }
    
    return true;
  });
};

