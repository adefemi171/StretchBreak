import type { UserPreferences, HolidayPlan } from '../utils/types';
import { calculateEfficiency } from '../utils/planningAlgorithm';
import { parseISO } from 'date-fns';
import { getAllPlans } from './planStorage';

const STORAGE_KEY = 'user-preferences';

export const getUserPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Corrupt saved preferences fall back to defaults.
  }
  
  return {
    preferredMonths: [],
    typicalDuration: 5,
    efficiencyGoal: 1.5,
    pastPlans: [],
  };
};

export const updatePreferencesFromPlan = (_plan: HolidayPlan): void => {
  void _plan;
  const plans = getAllPlans();
  
  // Extract preferred months from all plans
  const months = new Set<number>();
  plans.forEach(p => {
    p.vacationDays.forEach(dateStr => {
      const date = parseISO(dateStr);
      months.add(date.getMonth());
    });
  });
  
  const durations = plans.map(p => p.vacationDays.length);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 5;
  
  const efficiencies = plans.map(p => {
    const { vacationDaysUsed, totalDaysOff } = calculateEfficiency(p.vacationDays, [...p.publicHolidays, ...(p.companyHolidays ?? [])], p.workDays);
    return vacationDaysUsed > 0 ? totalDaysOff / vacationDaysUsed : 0;
  });
  const avgEfficiency = efficiencies.length > 0
    ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
    : 1.5;
  
  const updated: UserPreferences = {
    preferredMonths: Array.from(months),
    typicalDuration: Math.round(avgDuration),
    efficiencyGoal: avgEfficiency,
    pastPlans: plans.map(p => p.id),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const savePreferences = (preferences: UserPreferences): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
};

