import type { PublicHoliday, PlanSuggestion } from './types';
import { parseISO, addDays, subDays, format, eachDayOfInterval, differenceInCalendarDays } from 'date-fns';
import { isWeekendDay } from './dateUtils';
import { isSafeIsoDate } from './importValidation';

type HolidayDate = { date: string };
export interface VacationBreak {
  startDate: string;
  endDate: string;
  leaveDates: string[];
  totalDaysOff: number;
}

export const getLeaveDates = (
  startDate: string,
  endDate: string,
  holidays: HolidayDate[],
  workDays?: number[],
): string[] => {
  if (!isSafeIsoDate(startDate) || !isSafeIsoDate(endDate) || startDate > endDate) return [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (differenceInCalendarDays(end, start) > 3 * 366) return [];
  const holidayDates = new Set(holidays.map(h => h.date));
  return eachDayOfInterval({ start, end })
    .filter(date => !isWeekendDay(date, workDays) && !holidayDates.has(format(date, 'yyyy-MM-dd')))
    .map(date => format(date, 'yyyy-MM-dd'));
};

/** Count only actual connected breaks. An unselected working day always splits a break. */
export const getVacationBreaks = (
  vacationDays: string[],
  holidays: HolidayDate[],
  workDays?: number[],
): VacationBreak[] => {
  const holidayDates = new Set(holidays.filter(h => isSafeIsoDate(h.date)).map(h => h.date));
  const leaveDates = [...new Set(vacationDays.filter(isSafeIsoDate))]
    .filter(date => !isWeekendDay(date, workDays) && !holidayDates.has(date)).sort();
  const selected = new Set(leaveDates);
  const isOff = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return selected.has(key) || holidayDates.has(key) || isWeekendDay(date, workDays);
  };
  const breaks: VacationBreak[] = [];
  for (const date of leaveDates) {
    if (breaks.length && date <= breaks[breaks.length - 1].endDate) continue;
    let start = parseISO(date);
    let end = start;
    while (isOff(subDays(start, 1))) start = subDays(start, 1);
    while (isOff(addDays(end, 1))) end = addDays(end, 1);
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    breaks.push({
      startDate, endDate,
      leaveDates: leaveDates.filter(day => day >= startDate && day <= endDate),
      totalDaysOff: differenceInCalendarDays(end, start) + 1,
    });
  }
  return breaks;
};

export const calculateEfficiency = (
  vacationDays: string[],
  holidays: HolidayDate[],
  workDays?: number[],
): { vacationDaysUsed: number; totalDaysOff: number } => {
  const breaks = getVacationBreaks(vacationDays, holidays, workDays);
  return {
    vacationDaysUsed: breaks.reduce((sum, period) => sum + period.leaveDates.length, 0),
    totalDaysOff: breaks.reduce((sum, period) => sum + period.totalDaysOff, 0),
  };
};

/** Recompute all dates and claims; never trust numbers received from an external suggestion. */
export const normalizeSuggestion = (
  suggestion: PlanSuggestion,
  holidays: PublicHoliday[],
  workDays?: number[],
): PlanSuggestion | null => {
  const leaveDates = getLeaveDates(suggestion.startDate, suggestion.endDate, holidays, workDays);
  const breaks = getVacationBreaks(leaveDates, holidays, workDays);
  if (breaks.length !== 1) return null;
  const period = breaks[0];
  return {
    ...suggestion,
    startDate: period.startDate,
    endDate: period.endDate,
    leaveDates,
    vacationDaysUsed: leaveDates.length,
    totalDaysOff: period.totalDaysOff,
    efficiency: period.totalDaysOff / leaveDates.length,
    publicHolidaysIncluded: holidays.filter(h => h.date >= period.startDate && h.date <= period.endDate),
  };
};

/** Explore windows around every holiday without assuming a Monday-Friday workweek. */
export const generateVacationCandidates = (
  holidays: PublicHoliday[],
  startDate: string,
  endDate: string,
  workDays?: number[],
): PlanSuggestion[] => {
  if (!isSafeIsoDate(startDate) || !isSafeIsoDate(endDate) || startDate > endDate) return [];
  const unique = new Map<string, PlanSuggestion>();
  for (const holiday of holidays) {
    if (!isSafeIsoDate(holiday.date) || holiday.date < startDate || holiday.date > endDate) continue;
    for (let before = 0; before <= 14; before++) {
      for (let after = 0; after <= 14 && before + after <= 20; after++) {
        const first = format(subDays(parseISO(holiday.date), before), 'yyyy-MM-dd');
        const last = format(addDays(parseISO(holiday.date), after), 'yyyy-MM-dd');
        if (first < startDate || last > endDate) continue;
        const suggestion = normalizeSuggestion({
          startDate: first, endDate: last, vacationDaysUsed: 0, totalDaysOff: 0, efficiency: 0,
          reason: `Break around ${holiday.localName || holiday.name}`,
          publicHolidaysIncluded: [],
        }, holidays, workDays);
        if (!suggestion || suggestion.startDate < startDate || suggestion.endDate > endDate) continue;
        unique.set(`${suggestion.startDate}/${suggestion.endDate}`, suggestion);
      }
    }
  }
  return [...unique.values()].sort((a, b) => b.efficiency - a.efficiency || b.totalDaysOff - a.totalDaysOff || a.startDate.localeCompare(b.startDate));
};

export const findOptimalVacationPeriods = (holidays: PublicHoliday[], year: number, workDays?: number[]): PlanSuggestion[] =>
  generateVacationCandidates(holidays, `${year}-01-01`, `${year}-12-31`, workDays)
    .slice(0, 20).sort((a, b) => a.startDate.localeCompare(b.startDate));

export interface CarryoverBudget { days: number; expiryMonth: number; year: number }

/** availablePTODays includes remaining carryover; only eligible actual leave can consume it. */
export const canAllocateLeaveDates = (
  dates: string[], availablePTODays: number, carryover?: CarryoverBudget,
): boolean => {
  const unique = [...new Set(dates.filter(isSafeIsoDate))];
  const carryoverDays = carryover && carryover.expiryMonth >= 1 && carryover.expiryMonth <= 12
    ? Math.max(0, Math.min(availablePTODays, carryover.days)) : 0;
  const eligible = carryoverDays && carryover ? unique.filter(date =>
    Number(date.slice(0, 4)) === carryover.year && Number(date.slice(5, 7)) <= carryover.expiryMonth).length : 0;
  const annualNeeded = unique.length - Math.min(carryoverDays, eligible);
  return annualNeeded <= Math.max(0, availablePTODays - carryoverDays);
};
