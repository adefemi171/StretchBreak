import { parseISO, getMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { PlanSuggestion, SuggestionFilters, SuggestionSortBy } from './types';

const SEASON_MONTHS: Record<string, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
  winter: [12, 1, 2],
};

export const getEmptyFilters = (): SuggestionFilters => ({
  months: [],
  seasons: [],
  excludeDateRanges: [],
  excludeHolidayNames: [],
  sortBy: 'efficiency',
});

export const applySuggestionFilters = (
  suggestions: PlanSuggestion[],
  filters: SuggestionFilters
): PlanSuggestion[] => {
  let filtered = [...suggestions];

  // Filter by months
  const monthsToInclude = new Set<number>();
  filters.months.forEach((m) => monthsToInclude.add(m));
  filters.seasons.forEach((season) => {
    const months = SEASON_MONTHS[season.toLowerCase()];
    if (months) {
      months.forEach((m) => monthsToInclude.add(m));
    }
  });

  if (monthsToInclude.size > 0) {
    filtered = filtered.filter((s) => {
      const month = getMonth(parseISO(s.startDate)) + 1;
      return monthsToInclude.has(month);
    });
  }

  // Filter by duration (vacationDaysUsed)
  if (filters.minDuration !== undefined) {
    filtered = filtered.filter((s) => s.vacationDaysUsed >= filters.minDuration!);
  }
  if (filters.maxDuration !== undefined) {
    filtered = filtered.filter((s) => s.vacationDaysUsed <= filters.maxDuration!);
  }

  // Filter by efficiency
  if (filters.minEfficiency !== undefined) {
    filtered = filtered.filter((s) => s.efficiency >= filters.minEfficiency!);
  }

  // Exclude date ranges
  if (filters.excludeDateRanges.length > 0) {
    filtered = filtered.filter((s) => {
      const start = parseISO(s.startDate);
      const end = parseISO(s.endDate);

      return !filters.excludeDateRanges.some((range) => {
        const rangeStart = startOfDay(parseISO(range.start));
        const rangeEnd = endOfDay(parseISO(range.end));

        return (
          isWithinInterval(start, { start: rangeStart, end: rangeEnd }) ||
          isWithinInterval(end, { start: rangeStart, end: rangeEnd }) ||
          (start <= rangeStart && end >= rangeEnd)
        );
      });
    });
  }

  // Exclude holiday names
  if (filters.excludeHolidayNames.length > 0) {
    filtered = filtered.filter((s) => {
      return !s.publicHolidaysIncluded.some((h) =>
        filters.excludeHolidayNames.some(
          (name) =>
            h.name.toLowerCase().includes(name.toLowerCase()) ||
            h.localName.toLowerCase().includes(name.toLowerCase())
        )
      );
    });
  }

  // Sort
  filtered = sortSuggestions(filtered, filters.sortBy);

  return filtered;
};

export const sortSuggestions = (
  suggestions: PlanSuggestion[],
  sortBy: SuggestionSortBy
): PlanSuggestion[] => {
  const sorted = [...suggestions];

  switch (sortBy) {
    case 'efficiency':
      sorted.sort((a, b) => b.efficiency - a.efficiency);
      break;
    case 'totalDaysOff':
      sorted.sort((a, b) => b.totalDaysOff - a.totalDaysOff);
      break;
    case 'vacationDaysUsed':
      sorted.sort((a, b) => a.vacationDaysUsed - b.vacationDaysUsed);
      break;
    case 'startDate':
      sorted.sort((a, b) => a.startDate.localeCompare(b.startDate));
      break;
  }

  return sorted;
};

export const isFiltersEmpty = (filters: SuggestionFilters): boolean => {
  return (
    filters.months.length === 0 &&
    filters.seasons.length === 0 &&
    filters.minDuration === undefined &&
    filters.maxDuration === undefined &&
    filters.minEfficiency === undefined &&
    filters.excludeDateRanges.length === 0 &&
    filters.excludeHolidayNames.length === 0 &&
    filters.sortBy === 'efficiency'
  );
};
