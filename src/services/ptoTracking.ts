import { getAllPlans } from './planStorage';
import type { HolidayPlan } from '../utils/types';

const TOTAL_PTO_KEY = 'total-pto-days';
const INITIAL_PTO_KEY = 'initial-pto-days';

/**
 * Set the total available PTO days for the year
 */
export const setTotalPTODays = (days: number): void => {
  localStorage.setItem(TOTAL_PTO_KEY, days.toString());
  // Store initial PTO for reference
  if (!localStorage.getItem(INITIAL_PTO_KEY)) {
    localStorage.setItem(INITIAL_PTO_KEY, days.toString());
  }
};

/**
 * Get the total available PTO days
 */
export const getTotalPTODays = (): number => {
  const stored = localStorage.getItem(TOTAL_PTO_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Get the initial PTO days (first time it was set)
 */
export const getInitialPTODays = (): number => {
  const stored = localStorage.getItem(INITIAL_PTO_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Calculate total PTO used across all saved plans
 */
export const getUsedPTODays = (): number => {
  const plans = getAllPlans();
  let totalUsed = 0;
  
  // Count unique vacation days across all plans
  const allVacationDays = new Set<string>();
  
  plans.forEach(plan => {
    plan.vacationDays.forEach(day => {
      allVacationDays.add(day);
    });
  });
  
  return allVacationDays.size;
};

/**
 * Calculate remaining PTO days
 */
export const getRemainingPTODays = (): number => {
  const total = getTotalPTODays();
  const used = getUsedPTODays();
  return Math.max(0, total - used);
};

/**
 * Check if there are any saved plans with PTO tracking
 */
export const hasSavedPlansWithPTO = (): boolean => {
  const plans = getAllPlans();
  return plans.length > 0 && getTotalPTODays() > 0;
};

/**
 * Reset PTO tracking (useful for new year)
 */
export const resetPTOTracking = (): void => {
  localStorage.removeItem(TOTAL_PTO_KEY);
  localStorage.removeItem(INITIAL_PTO_KEY);
};

/**
 * Reset all PTO data (complete reset)
 */
export const resetAllPTOData = (): void => {
  localStorage.removeItem(TOTAL_PTO_KEY);
  localStorage.removeItem(INITIAL_PTO_KEY);
};

