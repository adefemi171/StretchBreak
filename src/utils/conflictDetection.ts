import { parseISO, format, isWeekend, addDays, subDays } from 'date-fns';
import type { PublicHoliday, CompanyHoliday } from './types';

export interface HolidayConflict {
  vacationDate: string;
  conflictingHoliday: PublicHoliday | CompanyHoliday;
  type: 'public' | 'company';
}

export interface ConflictAnalysis {
  holidayConflicts: HolidayConflict[];
  hasConflicts: boolean;
  alternativeDates: string[];
}

/**
 * Detect vacation days that fall on holidays.
 *
 * The calendar blocks selecting public/company holidays, so overlaps are uncommon.
 * Real cases: company holidays added after days were selected, imported/legacy plans,
 * or country/region changes that introduce new holidays on already-selected dates.
 */
export const detectHolidayConflicts = (
  vacationDays: string[],
  publicHolidays: PublicHoliday[],
  companyHolidays: CompanyHoliday[] = []
): HolidayConflict[] => {
  const conflicts: HolidayConflict[] = [];

  const vacationSet = new Set(
    vacationDays
      .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim()))
      .map(d => d.trim())
  );

  if (vacationSet.size === 0) return conflicts;

  // Prefer company holidays — these can be added after PTO was selected
  companyHolidays.forEach(holiday => {
    if (vacationSet.has(holiday.date)) {
      conflicts.push({
        vacationDate: holiday.date,
        conflictingHoliday: holiday,
        type: 'company',
      });
    }
  });

  const companyDates = new Set(companyHolidays.map(h => h.date));

  // Public holidays only when a selected day is actually also a holiday
  // (edge case: import, legacy data, or holiday set changed after selection)
  publicHolidays.forEach(holiday => {
    if (vacationSet.has(holiday.date) && !companyDates.has(holiday.date)) {
      conflicts.push({
        vacationDate: holiday.date,
        conflictingHoliday: holiday,
        type: 'public',
      });
    }
  });

  return conflicts;
};

/**
 * Suggest alternative dates for conflicting vacation days
 * Finds nearby weekdays that aren't weekends, holidays, or already used
 */
export const suggestAlternativeDates = (
  conflictDates: string[],
  publicHolidays: PublicHoliday[],
  companyHolidays: CompanyHoliday[] = [],
  usedDates: Set<string> = new Set(),
  windowDays: number = 7
): string[] => {
  if (conflictDates.length === 0) return [];

  const holidayDates = new Set([
    ...publicHolidays.map(h => h.date),
    ...companyHolidays.map(h => h.date),
  ]);

  const suggestions: string[] = [];
  const maxSuggestions = Math.min(conflictDates.length * 2, 3);

  for (const conflictDate of conflictDates) {
    if (suggestions.length >= maxSuggestions) break;

    const date = parseISO(conflictDate);

    for (let offset = 1; offset <= windowDays; offset++) {
      if (suggestions.length >= maxSuggestions) break;

      const before = subDays(date, offset);
      const beforeStr = format(before, 'yyyy-MM-dd');

      if (
        !isWeekend(before) &&
        !holidayDates.has(beforeStr) &&
        !usedDates.has(beforeStr) &&
        !suggestions.includes(beforeStr)
      ) {
        suggestions.push(beforeStr);
      }

      if (suggestions.length >= maxSuggestions) break;

      const after = addDays(date, offset);
      const afterStr = format(after, 'yyyy-MM-dd');

      if (
        !isWeekend(after) &&
        !holidayDates.has(afterStr) &&
        !usedDates.has(afterStr) &&
        !suggestions.includes(afterStr)
      ) {
        suggestions.push(afterStr);
      }
    }
  }

  return suggestions.sort();
};

/**
 * Analyze vacation days for conflicts and suggest alternatives.
 * Uses the plan's own holiday lists so live country/region switches don't create false positives.
 */
export const analyzeConflicts = (
  vacationDays: string[],
  publicHolidays: PublicHoliday[],
  companyHolidays: CompanyHoliday[] = [],
  usedDates: Set<string> = new Set()
): ConflictAnalysis => {
  const holidayConflicts = detectHolidayConflicts(
    vacationDays,
    publicHolidays,
    companyHolidays
  );

  const conflictDates = holidayConflicts.map(c => c.vacationDate);

  const alternativeDates = conflictDates.length > 0
    ? suggestAlternativeDates(
        conflictDates,
        publicHolidays,
        companyHolidays,
        usedDates
      )
    : [];

  return {
    holidayConflicts,
    hasConflicts: holidayConflicts.length > 0,
    alternativeDates,
  };
};
