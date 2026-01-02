import { parseISO, addDays, subDays, isWeekend, format, getDay } from 'date-fns';
export const findOptimalVacationPeriods = (holidays, _year) => {
    const suggestions = [];
    // Group consecutive holidays
    const sortedHolidays = [...holidays]
        .map(h => ({ ...h, dateObj: parseISO(h.date) }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    for (let i = 0; i < sortedHolidays.length; i++) {
        const holiday = sortedHolidays[i];
        const holidayDate = holiday.dateObj;
        const dayOfWeek = getDay(holidayDate);
        // Check for bridge opportunities
        // If holiday is on Thursday (4), suggest Mon-Wed (3 days) to get 5 days off
        if (dayOfWeek === 4) { // Thursday
            const thursday = holidayDate;
            const friday = addDays(thursday, 1);
            // Check if Friday is also a holiday or weekend
            const fridayIsHoliday = sortedHolidays.some(h => format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd'));
            const fridayIsWeekend = isWeekend(friday);
            if (fridayIsHoliday || fridayIsWeekend) {
                // Suggest Monday-Wednesday before
                const monday = subDays(thursday, 3);
                const wednesday = subDays(thursday, 1);
                const vacationDays = [];
                let current = monday;
                while (current <= wednesday) {
                    if (!isWeekend(current)) {
                        vacationDays.push(format(current, 'yyyy-MM-dd'));
                    }
                    current = addDays(current, 1);
                }
                const totalDaysOff = vacationDays.length + 2; // +2 for Thu-Fri
                const efficiency = totalDaysOff / vacationDays.length;
                suggestions.push({
                    startDate: format(monday, 'yyyy-MM-dd'),
                    endDate: format(friday, 'yyyy-MM-dd'),
                    vacationDaysUsed: vacationDays.length,
                    totalDaysOff,
                    efficiency,
                    reason: `Bridge Mon-Wed before ${holiday.localName} (Thu-Fri)`,
                    publicHolidaysIncluded: [holiday, ...(fridayIsHoliday ? sortedHolidays.filter(h => format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd')) : [])],
                });
            }
        }
        // If holiday is on Friday (5), suggest Mon-Thu (4 days) to get 5 days off
        if (dayOfWeek === 5) { // Friday
            const friday = holidayDate;
            const monday = subDays(friday, 4);
            const thursday = subDays(friday, 1);
            // Check if Monday before is also a holiday
            const mondayIsHoliday = sortedHolidays.some(h => format(h.dateObj, 'yyyy-MM-dd') === format(monday, 'yyyy-MM-dd'));
            if (!mondayIsHoliday) {
                const vacationDays = [];
                let current = monday;
                while (current <= thursday) {
                    if (!isWeekend(current)) {
                        vacationDays.push(format(current, 'yyyy-MM-dd'));
                    }
                    current = addDays(current, 1);
                }
                const totalDaysOff = vacationDays.length + 1; // +1 for Friday
                const efficiency = totalDaysOff / vacationDays.length;
                suggestions.push({
                    startDate: format(monday, 'yyyy-MM-dd'),
                    endDate: format(friday, 'yyyy-MM-dd'),
                    vacationDaysUsed: vacationDays.length,
                    totalDaysOff,
                    efficiency,
                    reason: `Bridge Mon-Thu before ${holiday.localName} (Friday)`,
                    publicHolidaysIncluded: [holiday],
                });
            }
        }
        // If holiday is on Tuesday (2), suggest Mon only to get 2 days off
        if (dayOfWeek === 2) { // Tuesday
            const tuesday = holidayDate;
            const monday = subDays(tuesday, 1);
            if (!isWeekend(monday)) {
                suggestions.push({
                    startDate: format(monday, 'yyyy-MM-dd'),
                    endDate: format(tuesday, 'yyyy-MM-dd'),
                    vacationDaysUsed: 1,
                    totalDaysOff: 2,
                    efficiency: 2,
                    reason: `Take Monday before ${holiday.localName} (Tuesday)`,
                    publicHolidaysIncluded: [holiday],
                });
            }
        }
        // Check for consecutive holidays (e.g., Thu-Fri)
        if (i < sortedHolidays.length - 1) {
            const nextHoliday = sortedHolidays[i + 1];
            const daysBetween = Math.round((nextHoliday.dateObj.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysBetween === 1) {
                // Consecutive holidays
                const firstDay = holidayDate;
                const secondDay = nextHoliday.dateObj;
                const firstDayOfWeek = getDay(firstDay);
                const secondDayOfWeek = getDay(secondDay);
                // If Thu-Fri, suggest Mon-Wed
                if (firstDayOfWeek === 4 && secondDayOfWeek === 5) {
                    const monday = subDays(firstDay, 3);
                    const wednesday = subDays(firstDay, 1);
                    const vacationDays = [];
                    let current = monday;
                    while (current <= wednesday) {
                        if (!isWeekend(current)) {
                            vacationDays.push(format(current, 'yyyy-MM-dd'));
                        }
                        current = addDays(current, 1);
                    }
                    const totalDaysOff = vacationDays.length + 2;
                    const efficiency = totalDaysOff / vacationDays.length;
                    suggestions.push({
                        startDate: format(monday, 'yyyy-MM-dd'),
                        endDate: format(secondDay, 'yyyy-MM-dd'),
                        vacationDaysUsed: vacationDays.length,
                        totalDaysOff,
                        efficiency,
                        reason: `Bridge Mon-Wed before consecutive holidays (Thu-Fri)`,
                        publicHolidaysIncluded: [holiday, nextHoliday],
                    });
                }
            }
        }
    }
    // Sort by total days off (highest first), then by vacation days used (lowest first)
    return suggestions.sort((a, b) => {
        if (b.totalDaysOff !== a.totalDaysOff) {
            return b.totalDaysOff - a.totalDaysOff;
        }
        return a.vacationDaysUsed - b.vacationDaysUsed;
    });
};
export const calculateEfficiency = (vacationDays, holidays) => {
    const vacationDaysUsed = vacationDays.length;
    // Count total days off including weekends and holidays
    const allDays = new Set(vacationDays);
    // Add weekends within vacation period
    vacationDays.forEach(dateStr => {
        const date = parseISO(dateStr);
        const saturday = addDays(date, (6 - getDay(date)) % 7);
        const sunday = addDays(saturday, 1);
        if (getDay(date) !== 0 && getDay(date) !== 6) {
            allDays.add(format(saturday, 'yyyy-MM-dd'));
            allDays.add(format(sunday, 'yyyy-MM-dd'));
        }
    });
    // Add public holidays
    holidays.forEach(holiday => {
        allDays.add(holiday.date);
    });
    const totalDaysOff = allDays.size;
    return { vacationDaysUsed, totalDaysOff };
};
