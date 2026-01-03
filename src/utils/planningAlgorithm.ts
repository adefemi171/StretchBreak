import type { PublicHoliday, PlanSuggestion } from './types';
import { parseISO, addDays, subDays, isWeekend, format, getDay, eachDayOfInterval } from 'date-fns';

export const findOptimalVacationPeriods = (
  holidays: PublicHoliday[],
  _year: number
): PlanSuggestion[] => {
  const suggestions: PlanSuggestion[] = [];
  const suggestionKeys = new Set<string>();
  
  const sortedHolidays = [...holidays]
    .map(h => ({ ...h, dateObj: parseISO(h.date) }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  
  for (let i = 0; i < sortedHolidays.length; i++) {
    const holiday = sortedHolidays[i];
    const holidayDate = holiday.dateObj;
    const dayOfWeek = getDay(holidayDate);
    
    if (dayOfWeek === 4) {
      const thursday = holidayDate;
      const friday = addDays(thursday, 1);
      const fridayIsHoliday = sortedHolidays.some(h => 
        format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd')
      );
      const fridayIsWeekend = isWeekend(friday);
      
      const monday = subDays(thursday, 3);
      const wednesday = subDays(thursday, 1);
      
      const baseVacationDays = [];
      let current = monday;
      while (current <= wednesday) {
        if (!isWeekend(current)) {
          baseVacationDays.push(format(current, 'yyyy-MM-dd'));
        }
        current = addDays(current, 1);
      }
      
      if (fridayIsHoliday || fridayIsWeekend) {
        const totalDaysOff = baseVacationDays.length + 1 + 1 + 2;
        const efficiency = totalDaysOff / baseVacationDays.length;
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(friday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
        if (!suggestionKeys.has(suggestionKey)) {
          suggestionKeys.add(suggestionKey);
          suggestions.push({
            startDate: startDateStr,
            endDate: endDateStr,
            vacationDaysUsed: baseVacationDays.length,
            totalDaysOff,
            efficiency,
            reason: `Bridge Mon-Wed before ${holiday.localName} (Thu-Fri)`,
            publicHolidaysIncluded: [holiday, ...(fridayIsHoliday ? sortedHolidays.filter(h => 
              format(h.dateObj, 'yyyy-MM-dd') === format(friday, 'yyyy-MM-dd')
            ) : [])],
          });
        }
      } else {
        const conservativeStartDateStr = format(monday, 'yyyy-MM-dd');
        const conservativeEndDateStr = format(thursday, 'yyyy-MM-dd');
        const conservativeKey = `${conservativeStartDateStr}-${conservativeEndDateStr}`;
        
        if (!suggestionKeys.has(conservativeKey)) {
          suggestionKeys.add(conservativeKey);
          suggestions.push({
            startDate: conservativeStartDateStr,
            endDate: conservativeEndDateStr,
            vacationDaysUsed: baseVacationDays.length,
            totalDaysOff: baseVacationDays.length + 1,
            efficiency: (baseVacationDays.length + 1) / baseVacationDays.length,
            reason: `Bridge Mon-Wed before ${holiday.localName} (Thursday) - 4-day break`,
            publicHolidaysIncluded: [holiday],
          });
        }
        
        const extendedVacationDays = [...baseVacationDays, format(friday, 'yyyy-MM-dd')];
        const extendedStartDateStr = format(monday, 'yyyy-MM-dd');
        const extendedEndDateStr = format(friday, 'yyyy-MM-dd');
        const extendedKey = `${extendedStartDateStr}-${extendedEndDateStr}`;
        
        if (!suggestionKeys.has(extendedKey)) {
          suggestionKeys.add(extendedKey);
          suggestions.push({
            startDate: extendedStartDateStr,
            endDate: extendedEndDateStr,
            vacationDaysUsed: extendedVacationDays.length,
            totalDaysOff: extendedVacationDays.length + 1 + 2,
            efficiency: (extendedVacationDays.length + 1 + 2) / extendedVacationDays.length,
            reason: `Bridge Mon-Wed + Fri before ${holiday.localName} (Thursday) - 6-day break`,
            publicHolidaysIncluded: [holiday],
          });
        }
      }
    }
    
    if (dayOfWeek === 5) {
      const friday = holidayDate;
      const monday = subDays(friday, 4);
      const thursday = subDays(friday, 1);
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
        
        const totalDaysOff = vacationDays.length + 1;
        const efficiency = totalDaysOff / vacationDays.length;
        
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(friday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
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
    
    if (dayOfWeek === 2) {
      const tuesday = holidayDate;
      const monday = subDays(tuesday, 1);
      
      if (!isWeekend(monday)) {
        const startDateStr = format(monday, 'yyyy-MM-dd');
        const endDateStr = format(tuesday, 'yyyy-MM-dd');
        const suggestionKey = `${startDateStr}-${endDateStr}`;
        
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
    
    if (i < sortedHolidays.length - 1) {
      const nextHoliday = sortedHolidays[i + 1];
      const daysBetween = Math.round(
        (nextHoliday.dateObj.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysBetween === 1) {
        const firstDay = holidayDate;
        const secondDay = nextHoliday.dateObj;
        const firstDayOfWeek = getDay(firstDay);
        const secondDayOfWeek = getDay(secondDay);
        
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
  
  const sorted = suggestions.sort((a, b) => {
    if (b.totalDaysOff !== a.totalDaysOff) {
      return b.totalDaysOff - a.totalDaysOff;
    }
    return a.vacationDaysUsed - b.vacationDaysUsed;
  });
  
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
  
  const sortedDates = [...vacationDays].sort();
  let startDate = parseISO(sortedDates[0]);
  let endDate = parseISO(sortedDates[sortedDates.length - 1]);
  
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
  
  const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
  const allDaysSet = new Set<string>();
  
  allDaysInRange.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    allDaysSet.add(dateStr);
  });
  
  const totalDaysOff = allDaysSet.size;
  
  return { vacationDaysUsed, totalDaysOff };
};

