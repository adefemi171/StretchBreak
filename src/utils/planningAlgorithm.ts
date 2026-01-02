import type { PublicHoliday, PlanSuggestion } from './types';
import { parseISO, addDays, subDays, isWeekend, format, getDay, eachDayOfInterval } from 'date-fns';

export const findOptimalVacationPeriods = (
  holidays: PublicHoliday[],
  _year: number
): PlanSuggestion[] => {
  const suggestions: PlanSuggestion[] = [];
  const suggestionKeys = new Set<string>(); // Track unique suggestions by date range
  
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
      const fridayIsHoliday = sortedHolidays.some(h => 
        format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd')
      );
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
        
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(friday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
        // Only add if we haven't seen this date range before
        if (!suggestionKeys.has(suggestionKey)) {
          suggestionKeys.add(suggestionKey);
          suggestions.push({
            startDate: startDateStr,
            endDate: endDateStr,
            vacationDaysUsed: vacationDays.length,
            totalDaysOff,
            efficiency,
            reason: `Bridge Mon-Wed before ${holiday.localName} (Thu-Fri)`,
            publicHolidaysIncluded: [holiday, ...(fridayIsHoliday ? sortedHolidays.filter(h => 
              format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd')
            ) : [])],
          });
        }
      }
    }
    
    // If holiday is on Friday (5), suggest Mon-Thu (4 days) to get 5 days off
    if (dayOfWeek === 5) { // Friday
      const friday = holidayDate;
      const monday = subDays(friday, 4);
      const thursday = subDays(friday, 1);
      
      // Check if Monday before is also a holiday
      const mondayIsHoliday = sortedHolidays.some(h => 
        format(h.dateObj, 'yyyy-MM-dd') === format(monday, 'yyyy-MM-dd')
      );
      
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
        
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(friday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
        // Only add if we haven't seen this date range before
        if (!suggestionKeys.has(suggestionKey)) {
          suggestionKeys.add(suggestionKey);
          suggestions.push({
            startDate: startDateStr,
            endDate: endDateStr,
            vacationDaysUsed: vacationDays.length,
            totalDaysOff,
            efficiency,
            reason: `Bridge Mon-Thu before ${holiday.localName} (Friday)`,
            publicHolidaysIncluded: [holiday],
          });
        }
      }
    }
    
    // If holiday is on Tuesday (2), suggest Mon only to get 2 days off
    if (dayOfWeek === 2) { // Tuesday
      const tuesday = holidayDate;
      const monday = subDays(tuesday, 1);
      
      if (!isWeekend(monday)) {
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(tuesday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
        // Only add if we haven't seen this date range before
        if (!suggestionKeys.has(suggestionKey)) {
          suggestionKeys.add(suggestionKey);
          suggestions.push({
            startDate: startDateStr,
            endDate: endDateStr,
            vacationDaysUsed: 1,
            totalDaysOff: 2,
            efficiency: 2,
            reason: `Take Monday before ${holiday.localName} (Tuesday)`,
            publicHolidaysIncluded: [holiday],
          });
        }
      }
    }
    
    // Check for consecutive holidays (e.g., Thu-Fri)
    if (i < sortedHolidays.length - 1) {
      const nextHoliday = sortedHolidays[i + 1];
      const daysBetween = Math.round(
        (nextHoliday.dateObj.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
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
          
          const startDateStr = format(monday, 'yyyy-MM-dd');
          const endDateStr = format(secondDay, 'yyyy-MM-dd');
          const suggestionKey = `${startDateStr}-${endDateStr}`;
          
          // Only add if we haven't seen this date range before
          // This prevents duplicates when a holiday matches both individual and consecutive patterns
          if (!suggestionKeys.has(suggestionKey)) {
            suggestionKeys.add(suggestionKey);
            suggestions.push({
              startDate: startDateStr,
              endDate: endDateStr,
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
  }
  
  // Sort by total days off (highest first), then by vacation days used (lowest first)
  const sorted = suggestions.sort((a, b) => {
    if (b.totalDaysOff !== a.totalDaysOff) {
      return b.totalDaysOff - a.totalDaysOff;
    }
    return a.vacationDaysUsed - b.vacationDaysUsed;
  });
  
  // Return top suggestions, sorted chronologically for better UX
  // Limit to top 10 by efficiency, then sort chronologically
  const topSuggestions = sorted.slice(0, 10);
  return topSuggestions.sort((a, b) => {
    const dateA = parseISO(a.startDate);
    const dateB = parseISO(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
};

export const calculateEfficiency = (
  vacationDays: string[],
  holidays: PublicHoliday[]
): { vacationDaysUsed: number; totalDaysOff: number } => {
  const vacationDaysUsed = vacationDays.length;
  
  if (vacationDays.length === 0) {
    return { vacationDaysUsed: 0, totalDaysOff: 0 };
  }
  
  // Get date range from first to last vacation day
  const sortedDates = [...vacationDays].sort();
  let startDate = parseISO(sortedDates[0]);
  let endDate = parseISO(sortedDates[sortedDates.length - 1]);
  
  // Extend range to include adjacent holidays and weekends that create continuous break
  // Check for holidays/weekends immediately before the first vacation day
  let checkDate = subDays(startDate, 1);
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date === dateStr);
    const isWeekendDay = isWeekend(checkDate);
    
    if (isHoliday || isWeekendDay) {
      startDate = checkDate;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  // Check for holidays/weekends immediately after the last vacation day
  checkDate = addDays(endDate, 1);
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date === dateStr);
    const isWeekendDay = isWeekend(checkDate);
    
    if (isHoliday || isWeekendDay) {
      endDate = checkDate;
      checkDate = addDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  // Get all days in the extended range
  const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
  const allDaysSet = new Set<string>();
  
  // Add all days in the continuous break period
  allDaysInRange.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    allDaysSet.add(dateStr);
  });
  
  const totalDaysOff = allDaysSet.size;
  
  return { vacationDaysUsed, totalDaysOff };
};

