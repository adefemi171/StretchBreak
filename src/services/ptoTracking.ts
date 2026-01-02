import { getAllPlans } from './planStorage';
import type { HolidayPlan } from '../utils/types';

const TOTAL_PTO_KEY = 'total-pto-days';
const INITIAL_PTO_KEY = 'initial-pto-days';
const AVAILABLE_PTO_INPUT_KEY = 'available-pto-input';

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
 * Counts unique vacation days across all plans (weekdays only, excluding holidays and weekends)
 */
export const getUsedPTODays = (): number => {
  const plans = getAllPlans();
  
  // Count unique vacation days across all plans
  // Vacation days are already stored as weekdays in YYYY-MM-DD format
  const allVacationDays = new Set<string>();
  
  plans.forEach(plan => {
    if (plan.vacationDays && Array.isArray(plan.vacationDays)) {
      plan.vacationDays.forEach(day => {
        if (day && typeof day === 'string') {
          // Dates should already be in YYYY-MM-DD format
          // Validate format and add to set
          if (/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
            allVacationDays.add(day.trim());
          } else {
            // Try to normalize if format is different
            try {
              const date = new Date(day);
              if (!isNaN(date.getTime())) {
                const normalized = date.toISOString().split('T')[0];
                allVacationDays.add(normalized);
              }
            } catch (error) {
              console.warn('Error normalizing vacation day:', day, error);
            }
          }
        }
      });
    }
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
  localStorage.removeItem(AVAILABLE_PTO_INPUT_KEY);
};

/**
 * Get the available PTO input value (persisted separately)
 */
export const getAvailablePTODaysInput = (): number => {
  const stored = localStorage.getItem(AVAILABLE_PTO_INPUT_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Set the available PTO input value (persisted separately)
 */
export const setAvailablePTODaysInput = (value: number): void => {
  localStorage.setItem(AVAILABLE_PTO_INPUT_KEY, value.toString());
};

