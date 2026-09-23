import type { PublicHoliday } from './types';

export const filterHolidaysByRegions = (
  holidays: PublicHoliday[],
  selectedRegions: string[],
  excludedHolidayDates: string[] = []
): PublicHoliday[] => {
  return holidays.filter(holiday => {
    // Observances, bank/school and optional holidays do not imply a day off.
    if (!holiday.types?.includes('Public') || excludedHolidayDates.includes(holiday.date)) {
      return false;
    }
    if (holiday.global) {
      return true;
    }
    
    if (holiday.counties && holiday.counties.length > 0) {
      return holiday.counties.some(county => selectedRegions?.includes(county));
    }
    
    // Unknown regional scope is not evidence of a national entitlement.
    return false;
  });
};
