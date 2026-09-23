import type { PublicHoliday, PlanSuggestion, VacationStrategy, CompanyHoliday } from './types';
import { format } from 'date-fns';
import { generateVacationCandidates, canAllocateLeaveDates, type CarryoverBudget } from './planningAlgorithm';

interface OptimizationParams {
  holidays: PublicHoliday[];
  companyHolidays: CompanyHoliday[];
  availablePTODays: number;
  strategy: VacationStrategy;
  startDate: Date;
  endDate: Date;
  carryover?: CarryoverBudget;
  workDays?: number[];
}

/** Select non-overlapping breaks within the timeframe and one shared annual/carryover budget. */
export const optimizeByStrategy = (params: OptimizationParams): PlanSuggestion[] => {
  const { holidays, companyHolidays, availablePTODays, strategy, startDate, endDate, carryover, workDays } = params;
  if (!Number.isFinite(availablePTODays) || availablePTODays <= 0 ||
      !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) return [];
  const allHolidays: PublicHoliday[] = [...holidays, ...companyHolidays.map(h => ({
    date: h.date, name: h.name, localName: h.name, countryCode: h.countryCode ?? '',
    fixed: false, global: true, counties: null, launchYear: null, types: ['Company'],
  }))];
  const candidates = generateVacationCandidates(allHolidays, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), workDays);
  const durations: Record<VacationStrategy, [number, number]> = {
    balanced: [3, 21], 'long-weekends': [3, 4], 'mini-breaks': [5, 6], 'week-long': [7, 9], extended: [10, 21],
  };
  const [min, max] = durations[strategy];
  const selected: PlanSuggestion[] = [];
  let allocated: string[] = [];
  for (const candidate of candidates) {
    if (candidate.totalDaysOff < min || candidate.totalDaysOff > max) continue;
    if (selected.some(other => candidate.startDate <= other.endDate && candidate.endDate >= other.startDate)) continue;
    const proposed = [...allocated, ...(candidate.leaveDates ?? [])];
    if (!canAllocateLeaveDates(proposed, availablePTODays, carryover)) continue;
    selected.push(candidate);
    allocated = proposed;
    if (selected.length === 20) break;
  }
  return selected.sort((a, b) => a.startDate.localeCompare(b.startDate));
};
