import { getAllPlans } from './planStorage';
import type { HolidayPlan } from '../utils/types';

const TOTAL_PTO_KEY = 'total-pto-days';
const INITIAL_PTO_KEY = 'initial-pto-days';
const AVAILABLE_PTO_INPUT_KEY = 'available-pto-input';
const CARRYOVER_DAYS_KEY = 'pto-carryover-days';
const CARRYOVER_EXPIRY_KEY = 'pto-carryover-expiry-month';

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
              // Silently skip invalid date
            }
          }
        }
      });
    }
  });
  
  return allVacationDays.size;
};

/**
 * Calculate PTO used for a specific year
 * Counts unique vacation days belonging to that year only
 */
export const getUsedPTODaysForYear = (year: number): number => {
  const plans = getAllPlans();
  const vacationDaysInYear = new Set<string>();
  
  plans.forEach(plan => {
    // Filter by plan's year if available, otherwise check date strings
    const planYear = plan.year;
    
    if (plan.vacationDays && Array.isArray(plan.vacationDays)) {
      plan.vacationDays.forEach(day => {
        if (day && typeof day === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
            const dayYear = parseInt(day.substring(0, 4), 10);
            if (dayYear === year) {
              vacationDaysInYear.add(day.trim());
            }
          } else {
            // Try to parse and check year
            try {
              const date = new Date(day);
              if (!isNaN(date.getTime()) && date.getFullYear() === year) {
                const normalized = date.toISOString().split('T')[0];
                vacationDaysInYear.add(normalized);
              }
            } catch (error) {
              // Silently skip invalid date
            }
          }
        }
      });
    }
  });
  
  return vacationDaysInYear.size;
};

/**
 * Calculate remaining PTO days (all years)
 */
export const getRemainingPTODays = (): number => {
  const total = getTotalPTODays();
  const used = getUsedPTODays();
  return Math.max(0, total - used);
};

const yearTotalKey = (year: number): string => `total-pto-days-${year}`;

/**
 * Whether a year-specific total is stored (vs relying on global fallback)
 */
export const hasTotalPTODaysForYear = (year: number): boolean => {
  return localStorage.getItem(yearTotalKey(year)) !== null;
};

/**
 * Get total PTO days for a specific year
 * Falls back to global total if year-specific not set
 */
export const getTotalPTODaysForYear = (year: number): number => {
  const stored = localStorage.getItem(yearTotalKey(year));
  if (stored !== null) {
    return parseInt(stored, 10);
  }
  // Fallback to global total
  return getTotalPTODays();
};

/**
 * Set total PTO days for a specific year
 */
export const setTotalPTODaysForYear = (year: number, days: number): void => {
  localStorage.setItem(yearTotalKey(year), days.toString());
};

/**
 * Calculate remaining PTO days for a specific year
 */
export const getRemainingPTODaysForYear = (year: number, total?: number): number => {
  const totalPTO = total ?? getTotalPTODaysForYear(year);
  const used = getUsedPTODaysForYear(year);
  return Math.max(0, totalPTO - used);
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
  localStorage.removeItem(CARRYOVER_DAYS_KEY);
  localStorage.removeItem(CARRYOVER_EXPIRY_KEY);
  // Clear per-year totals (total-pto-days-2026, etc.)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && /^total-pto-days-\d{4}$/.test(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
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

/**
 * Get carryover PTO days and expiry month
 * Returns { days: 0, expiryMonth: 0 } if no carryover is set
 */
export const getCarryover = (): { days: number; expiryMonth: number } => {
  const days = localStorage.getItem(CARRYOVER_DAYS_KEY);
  const expiry = localStorage.getItem(CARRYOVER_EXPIRY_KEY);
  return {
    days: days ? parseInt(days, 10) : 0,
    expiryMonth: expiry ? parseInt(expiry, 10) : 0,
  };
};

/**
 * Set carryover PTO days and expiry month
 * Set days to 0 to clear carryover
 */
export const setCarryover = (days: number, expiryMonth: number): void => {
  if (days <= 0) {
    localStorage.removeItem(CARRYOVER_DAYS_KEY);
    localStorage.removeItem(CARRYOVER_EXPIRY_KEY);
  } else {
    localStorage.setItem(CARRYOVER_DAYS_KEY, days.toString());
    localStorage.setItem(CARRYOVER_EXPIRY_KEY, expiryMonth.toString());
  }
};

/**
 * Whether carryover is still usable on asOfDate (inclusive through last day of expiryMonth).
 * expiryMonth is 1–12; `new Date(year, month, 0)` is the last day of that month.
 */
export const isCarryoverUsable = (
  expiryMonth: number,
  asOfDate: Date = new Date(),
  year?: number
): boolean => {
  if (expiryMonth <= 0) return false;
  const y = year ?? asOfDate.getFullYear();
  const lastDayOfExpiryMonth = new Date(y, expiryMonth, 0);
  return asOfDate <= lastDayOfExpiryMonth;
};

/**
 * Effective available PTO = remaining annual + usable carryover (before expiry).
 * If year is provided, uses year-scoped PTO tracking.
 */
export const getEffectiveAvailablePTODays = (
  asOfDate?: Date,
  year?: number
): number => {
  let remaining: number;
  
  if (year !== undefined) {
    // Year-scoped: use year-specific remaining
    remaining = getRemainingPTODaysForYear(year);
  } else {
    // Global: use all years
    remaining = getRemainingPTODays();
  }
  
  const carryover = getCarryover();

  if (carryover.days <= 0 || carryover.expiryMonth <= 0) {
    return remaining;
  }

  const now = asOfDate || new Date();
  const targetYear = year ?? now.getFullYear();
  
  if (isCarryoverUsable(carryover.expiryMonth, now, targetYear)) {
    return remaining + carryover.days;
  }

  return remaining;
};

