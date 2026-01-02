/**
 * Filter holidays by selected regions
 * If no regions selected, returns all holidays
 * If regions selected, returns only holidays that apply to at least one selected region
 */
export const filterHolidaysByRegions = (holidays, selectedRegions) => {
    // If no regions selected, return all holidays (default behavior)
    if (!selectedRegions || selectedRegions.length === 0) {
        return holidays;
    }
    // Filter holidays that:
    // 1. Are global (apply to all regions)
    // 2. Have counties that include at least one selected region
    return holidays.filter(holiday => {
        // Global holidays apply to all regions
        if (holiday.global) {
            return true;
        }
        // If holiday has counties, check if any selected region matches
        if (holiday.counties && holiday.counties.length > 0) {
            return holiday.counties.some(county => selectedRegions.includes(county));
        }
        // If holiday has no counties specified, it's likely a national holiday
        // Include it by default
        return true;
    });
};
