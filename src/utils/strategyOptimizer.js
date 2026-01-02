import { parseISO, addDays, subDays, isWeekend, format, getDay, isWithinInterval } from 'date-fns';
/**
 * Optimize vacation days based on strategy
 */
export const optimizeByStrategy = (params) => {
    const { holidays, companyHolidays, availablePTODays, strategy, startDate, endDate } = params;
    const allHolidays = [
        ...holidays.map(h => ({ date: h.date, name: h.localName, isPublic: true })),
        ...companyHolidays.map(h => ({ date: h.date, name: h.name, isPublic: false })),
    ].filter(h => {
        const holidayDate = parseISO(h.date);
        return isWithinInterval(holidayDate, { start: startDate, end: endDate });
    });
    const periods = findVacationPeriods(allHolidays, strategy, startDate, endDate);
    const optimized = optimizePTODistribution(periods, availablePTODays, strategy);
    return optimized;
};
/**
 * Find vacation periods based on strategy
 */
function findVacationPeriods(holidays, strategy, startDate, endDate) {
    const suggestions = [];
    const sortedHolidays = [...holidays]
        .map(h => ({ ...h, dateObj: parseISO(h.date) }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    for (let i = 0; i < sortedHolidays.length; i++) {
        const holiday = sortedHolidays[i];
        const holidayDate = holiday.dateObj;
        const dayOfWeek = getDay(holidayDate);
        // Strategy-specific logic
        switch (strategy) {
            case 'long-weekends':
                // Focus on 3-4 day weekends
                if (dayOfWeek === 4 || dayOfWeek === 5) { // Thu or Fri
                    const suggestion = createLongWeekendSuggestion(holiday, sortedHolidays, i);
                    if (suggestion)
                        suggestions.push(suggestion);
                }
                break;
            case 'mini-breaks':
                // 5-6 day breaks
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    const suggestion = createMiniBreakSuggestion(holiday, sortedHolidays, i);
                    if (suggestion)
                        suggestions.push(suggestion);
                }
                break;
            case 'week-long':
                // 7-9 day breaks
                const weekLong = createWeekLongSuggestion(holiday, sortedHolidays, i);
                if (weekLong)
                    suggestions.push(...weekLong);
                break;
            case 'extended':
                // 10-15 day vacations
                const extended = createExtendedSuggestion(holiday, sortedHolidays, i);
                if (extended)
                    suggestions.push(...extended);
                break;
            case 'balanced':
            default:
                // Mix of all types
                const balanced = createBalancedSuggestions(holiday, sortedHolidays, i);
                suggestions.push(...balanced);
                break;
        }
    }
    return suggestions;
}
function createLongWeekendSuggestion(holiday, _allHolidays, _index) {
    const holidayDate = holiday.dateObj;
    const dayOfWeek = getDay(holidayDate);
    if (dayOfWeek === 4) { // Thursday
        const monday = subDays(holidayDate, 3);
        const wednesday = subDays(holidayDate, 1);
        const vacationDays = getWeekdaysBetween(monday, wednesday);
        return {
            startDate: format(monday, 'yyyy-MM-dd'),
            endDate: format(addDays(holidayDate, 1), 'yyyy-MM-dd'),
            vacationDaysUsed: vacationDays.length,
            totalDaysOff: vacationDays.length + 2,
            efficiency: (vacationDays.length + 2) / vacationDays.length,
            reason: `Long weekend: Mon-Wed before ${holiday.name}`,
            publicHolidaysIncluded: [],
        };
    }
    if (dayOfWeek === 5) { // Friday
        const monday = subDays(holidayDate, 4);
        const thursday = subDays(holidayDate, 1);
        const vacationDays = getWeekdaysBetween(monday, thursday);
        return {
            startDate: format(monday, 'yyyy-MM-dd'),
            endDate: format(holidayDate, 'yyyy-MM-dd'),
            vacationDaysUsed: vacationDays.length,
            totalDaysOff: vacationDays.length + 1,
            efficiency: (vacationDays.length + 1) / vacationDays.length,
            reason: `Long weekend: Mon-Thu before ${holiday.name}`,
            publicHolidaysIncluded: [],
        };
    }
    return null;
}
function createMiniBreakSuggestion(holiday, _allHolidays, _index) {
    const holidayDate = holiday.dateObj;
    const dayOfWeek = getDay(holidayDate);
    // Create 5-6 day breaks
    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
        const start = subDays(holidayDate, dayOfWeek === 1 ? 0 : dayOfWeek - 1);
        const end = addDays(holidayDate, 5 - dayOfWeek);
        const vacationDays = getWeekdaysBetween(start, end).filter(d => {
            const date = parseISO(d);
            return date < holidayDate || date > holidayDate;
        });
        return {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
            vacationDaysUsed: vacationDays.length,
            totalDaysOff: vacationDays.length + 1,
            efficiency: (vacationDays.length + 1) / vacationDays.length,
            reason: `Mini break around ${holiday.name}`,
            publicHolidaysIncluded: [],
        };
    }
    return null;
}
function createWeekLongSuggestion(holiday, _allHolidays, _index) {
    const suggestions = [];
    const holidayDate = holiday.dateObj;
    // Create 7-9 day breaks
    const start = subDays(holidayDate, 5);
    const end = addDays(holidayDate, 3);
    const vacationDays = getWeekdaysBetween(start, end).filter(d => {
        const date = parseISO(d);
        return date < holidayDate || date > holidayDate;
    });
    if (vacationDays.length >= 7 && vacationDays.length <= 9) {
        suggestions.push({
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
            vacationDaysUsed: vacationDays.length,
            totalDaysOff: vacationDays.length + 1,
            efficiency: (vacationDays.length + 1) / vacationDays.length,
            reason: `Week-long break around ${holiday.name}`,
            publicHolidaysIncluded: [],
        });
    }
    return suggestions;
}
function createExtendedSuggestion(holiday, _allHolidays, _index) {
    const suggestions = [];
    const holidayDate = holiday.dateObj;
    // Create 10-15 day vacations
    const start = subDays(holidayDate, 7);
    const end = addDays(holidayDate, 7);
    const vacationDays = getWeekdaysBetween(start, end).filter(d => {
        const date = parseISO(d);
        return date < holidayDate || date > holidayDate;
    });
    if (vacationDays.length >= 10 && vacationDays.length <= 15) {
        suggestions.push({
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
            vacationDaysUsed: vacationDays.length,
            totalDaysOff: vacationDays.length + 1,
            efficiency: (vacationDays.length + 1) / vacationDays.length,
            reason: `Extended vacation around ${holiday.name}`,
            publicHolidaysIncluded: [],
        });
    }
    return suggestions;
}
function createBalancedSuggestions(holiday, allHolidays, index) {
    const suggestions = [];
    // Mix of different types
    const longWeekend = createLongWeekendSuggestion(holiday, allHolidays, index);
    if (longWeekend)
        suggestions.push(longWeekend);
    const miniBreak = createMiniBreakSuggestion(holiday, allHolidays, index);
    if (miniBreak)
        suggestions.push(miniBreak);
    return suggestions;
}
function getWeekdaysBetween(start, end) {
    const days = [];
    let current = new Date(start);
    while (current <= end) {
        if (!isWeekend(current)) {
            days.push(format(current, 'yyyy-MM-dd'));
        }
        current = addDays(current, 1);
    }
    return days;
}
function optimizePTODistribution(periods, availablePTODays, _strategy) {
    // Sort by strategy preferences
    const sorted = [...periods].sort((a, b) => {
        // Prioritize by total days off
        if (b.totalDaysOff !== a.totalDaysOff) {
            return b.totalDaysOff - a.totalDaysOff;
        }
        // Then by fewer vacation days used
        return a.vacationDaysUsed - b.vacationDaysUsed;
    });
    // Select periods that fit within available PTO days
    const selected = [];
    let usedDays = 0;
    for (const period of sorted) {
        if (usedDays + period.vacationDaysUsed <= availablePTODays) {
            selected.push(period);
            usedDays += period.vacationDaysUsed;
        }
    }
    return selected.slice(0, 10); // Return top 10 suggestions
}
