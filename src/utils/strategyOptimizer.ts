import type { PublicHoliday, PlanSuggestion, VacationStrategy, CompanyHoliday } from './types';
import { parseISO, addDays, subDays, isWeekend, format, getDay, isWithinInterval } from 'date-fns';

interface OptimizationParams {
  holidays: PublicHoliday[];
  companyHolidays: CompanyHoliday[];
  availablePTODays: number;
  strategy: VacationStrategy;
  startDate: Date;
  endDate: Date;
  carryover?: {
    days: number;
    expiryMonth: number;
    year: number;
  };
}

/**
 * Optimize vacation days based on strategy
 */
export const optimizeByStrategy = (params: OptimizationParams): PlanSuggestion[] => {
  const { holidays, companyHolidays, availablePTODays, strategy, startDate, endDate, carryover } = params;
  
  const allHolidays = [
    ...holidays.map(h => ({ date: h.date, name: h.localName, isPublic: true })),
    ...companyHolidays.map(h => ({ date: h.date, name: h.name, isPublic: false })),
  ].filter(h => {
    const holidayDate = parseISO(h.date);
    return isWithinInterval(holidayDate, { start: startDate, end: endDate });
  });
  
  const periods = findVacationPeriods(allHolidays, strategy, startDate, endDate);
  const optimized = optimizePTODistribution(periods, availablePTODays, strategy, carryover);
  
  return optimized;
};

/**
 * Find vacation periods based on strategy
 */
function findVacationPeriods(
  holidays: Array<{ date: string; name: string; isPublic: boolean }>,
  strategy: VacationStrategy,
  _startDate: Date,
  _endDate: Date
): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  const sortedHolidays = [...holidays]
    .map(h => ({ ...h, dateObj: parseISO(h.date) }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  
  for (let i = 0; i < sortedHolidays.length; i++) {
    const holiday = sortedHolidays[i];
    const holidayDate = holiday.dateObj;
    const dayOfWeek = getDay(holidayDate);
    
    const nextHoliday = i < sortedHolidays.length - 1 ? sortedHolidays[i + 1] : null;
    const daysBetween = nextHoliday 
      ? Math.round((nextHoliday.dateObj.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isConsecutiveHoliday = daysBetween === 1;
    
    // Strategy-specific logic
    switch (strategy) {
      case 'long-weekends':
        if (dayOfWeek === 4 || dayOfWeek === 5) {
          const suggestion = createLongWeekendSuggestion(holiday, sortedHolidays, i, isConsecutiveHoliday ? nextHoliday : null);
          if (suggestion) suggestions.push(suggestion);
        }
        break;
        
      case 'mini-breaks':
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const suggestion = createMiniBreakSuggestion(holiday, sortedHolidays, i, isConsecutiveHoliday ? nextHoliday : null);
          if (suggestion) suggestions.push(suggestion);
        }
        break;
        
      case 'week-long':
        const weekLong = createWeekLongSuggestion(holiday, sortedHolidays, i);
        if (weekLong) suggestions.push(...weekLong);
        break;
        
      case 'extended':
        const extended = createExtendedSuggestion(holiday, sortedHolidays, i);
        if (extended) suggestions.push(...extended);
        break;
        
      case 'balanced':
      default:
        const balanced = createBalancedSuggestions(holiday, sortedHolidays, i, isConsecutiveHoliday ? nextHoliday : null);
        suggestions.push(...balanced);
        break;
    }
  }
  
  return suggestions;
}

function createLongWeekendSuggestion(
  holiday: any,
  _allHolidays: any[],
  _index: number,
  nextHoliday?: any
): PlanSuggestion | null {
  const holidayDate = holiday.dateObj;
  const dayOfWeek = getDay(holidayDate);
  
  if (dayOfWeek === 4) { // Thursday
    const monday = subDays(holidayDate, 3);
    const wednesday = subDays(holidayDate, 1);
    const vacationDays = getWeekdaysBetween(monday, wednesday);
    const endDate = nextHoliday ? nextHoliday.dateObj : addDays(holidayDate, 1);
    const totalDaysOff = vacationDays.length + (nextHoliday ? 2 : 1);
    
    return {
      startDate: format(monday, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      vacationDaysUsed: vacationDays.length,
      totalDaysOff,
      efficiency: totalDaysOff / vacationDays.length,
      reason: nextHoliday 
        ? `Long weekend: Mon-Wed before ${holiday.name} and ${nextHoliday.name}`
        : `Long weekend: Mon-Wed before ${holiday.name}`,
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

function createMiniBreakSuggestion(
  holiday: any,
  _allHolidays: any[],
  _index: number,
  nextHoliday?: any
): PlanSuggestion | null {
  const holidayDate = holiday.dateObj;
  const dayOfWeek = getDay(holidayDate);
  
  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    const start = subDays(holidayDate, dayOfWeek === 1 ? 0 : dayOfWeek - 1);
    const end = nextHoliday ? nextHoliday.dateObj : addDays(holidayDate, 5 - dayOfWeek);
    const vacationDays = getWeekdaysBetween(start, end).filter(d => {
      const date = parseISO(d);
      return date < holidayDate || date > (nextHoliday ? nextHoliday.dateObj : holidayDate);
    });
    const totalDaysOff = vacationDays.length + (nextHoliday ? 2 : 1);
    
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      vacationDaysUsed: vacationDays.length,
      totalDaysOff,
      efficiency: totalDaysOff / vacationDays.length,
      reason: nextHoliday 
        ? `Mini break around ${holiday.name} and ${nextHoliday.name}`
        : `Mini break around ${holiday.name}`,
      publicHolidaysIncluded: [],
    };
  }
  
  return null;
}

function createWeekLongSuggestion(
  holiday: any,
  _allHolidays: any[],
  _index: number
): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  const holidayDate = holiday.dateObj;
  
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

function createExtendedSuggestion(
  holiday: any,
  _allHolidays: any[],
  _index: number
): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  const holidayDate = holiday.dateObj;
  
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

function createBalancedSuggestions(
  holiday: any,
  allHolidays: any[],
  index: number,
  nextHoliday?: any
): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  
  const longWeekend = createLongWeekendSuggestion(holiday, allHolidays, index, nextHoliday);
  if (longWeekend) suggestions.push(longWeekend);
  
  const miniBreak = createMiniBreakSuggestion(holiday, allHolidays, index, nextHoliday);
  if (miniBreak) suggestions.push(miniBreak);
  
  return suggestions;
}

function getWeekdaysBetween(start: Date, end: Date): string[] {
  const days: string[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    if (!isWeekend(current)) {
      days.push(format(current, 'yyyy-MM-dd'));
    }
    current = addDays(current, 1);
  }
  
  return days;
}

function optimizePTODistribution(
  periods: PlanSuggestion[],
  availablePTODays: number,
  _strategy: VacationStrategy,
  carryover?: {
    days: number;
    expiryMonth: number;
    year: number;
  }
): PlanSuggestion[] {
  const uniqueSuggestions = new Map<string, PlanSuggestion>();
  
  for (const suggestion of periods) {
    const key = `${suggestion.startDate}-${suggestion.endDate}`;
    const existing = uniqueSuggestions.get(key);
    
    if (!existing) {
      uniqueSuggestions.set(key, suggestion);
    } else {
      if (suggestion.efficiency > existing.efficiency) {
        uniqueSuggestions.set(key, suggestion);
      } else if (suggestion.efficiency === existing.efficiency) {
        if (suggestion.reason.length > existing.reason.length) {
          uniqueSuggestions.set(key, suggestion);
        }
      }
    }
  }
  
  // Sort by efficiency (descending) then by start date
  const sorted = Array.from(uniqueSuggestions.values()).sort((a, b) => {
    // First sort by efficiency (higher is better)
    if (b.efficiency !== a.efficiency) {
      return b.efficiency - a.efficiency;
    }
    // Then by start date (earlier is better)
    const dateA = parseISO(a.startDate);
    const dateB = parseISO(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Apply PTO budget constraint: greedily select suggestions until budget is exhausted
  // If carryover is provided, compute available budget for each suggestion based on expiry
  const budgetedSuggestions: PlanSuggestion[] = [];
  let totalPTOUsed = 0;
  
  for (const suggestion of sorted) {
    // Compute available budget for this suggestion
    let budgetForSuggestion = availablePTODays;
    
    if (carryover && carryover.days > 0 && carryover.expiryMonth > 0) {
      const suggestionStart = parseISO(suggestion.startDate);
      // Last day of carryover expiry month
      const lastDayOfExpiryMonth = new Date(carryover.year, carryover.expiryMonth, 0);
      
      // If suggestion starts after expiry, don't include carryover in budget
      if (suggestionStart > lastDayOfExpiryMonth) {
        // Budget is only annual remaining (carryover is already expired)
        // availablePTODays already includes carryover if passed from parent, so we need to subtract it
        budgetForSuggestion = availablePTODays - carryover.days;
      }
    }
    
    // Check if we can afford this suggestion
    if (totalPTOUsed + suggestion.vacationDaysUsed <= budgetForSuggestion) {
      budgetedSuggestions.push(suggestion);
      totalPTOUsed += suggestion.vacationDaysUsed;
    }
    
    // Stop if we've reached a reasonable number of suggestions
    if (budgetedSuggestions.length >= 20) {
      break;
    }
  }
  
  // Re-sort by start date for final display
  return budgetedSuggestions.sort((a, b) => {
    const dateA = parseISO(a.startDate);
    const dateB = parseISO(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
}

