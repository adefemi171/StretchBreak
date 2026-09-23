import { getAllPlans } from './planStorage';
import { isSafeIsoDate } from '../utils/importValidation';
import { canAllocateLeaveDates } from '../utils/planningAlgorithm';

const TOTAL_PTO_KEY = 'total-pto-days';
const INITIAL_PTO_KEY = 'initial-pto-days';
const AVAILABLE_PTO_INPUT_KEY = 'available-pto-input';
const yearTotalKey = (year: number) => `total-pto-days-${year}`;
const carryoverKey = (year: number) => `pto-carryover-${year}`;
const safeDays = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(366, Math.floor(Number(value)))) : 0;

export const setTotalPTODays = (days: number): void => {
  localStorage.setItem(TOTAL_PTO_KEY, String(safeDays(days)));
  if (localStorage.getItem(INITIAL_PTO_KEY) === null) localStorage.setItem(INITIAL_PTO_KEY, String(safeDays(days)));
};
export const getTotalPTODays = (): number => safeDays(localStorage.getItem(TOTAL_PTO_KEY));
export const getInitialPTODays = (): number => safeDays(localStorage.getItem(INITIAL_PTO_KEY));
export const hasTotalPTODaysForYear = (year: number): boolean => localStorage.getItem(yearTotalKey(year)) !== null;
export const getTotalPTODaysForYear = (year: number): number =>
  hasTotalPTODaysForYear(year) ? safeDays(localStorage.getItem(yearTotalKey(year))) : getTotalPTODays();
export const setTotalPTODaysForYear = (year: number, days: number): void => {
  localStorage.setItem(yearTotalKey(year), String(safeDays(days)));
};

const savedLeaveDates = (year?: number, excludePlanId?: string): string[] => [...new Set(
  getAllPlans().filter(plan => plan.id !== excludePlanId).flatMap(plan => plan.vacationDays ?? [])
    .filter(isSafeIsoDate).filter(date => year === undefined || Number(date.slice(0, 4)) === year)
)].sort();
export const getUsedPTODays = (): number => savedLeaveDates().length;
export const getUsedPTODaysForYear = (year: number): number => savedLeaveDates(year).length;

export const getCarryover = (year = new Date().getFullYear()): { days: number; expiryMonth: number; year: number } => {
  try {
    const value = JSON.parse(localStorage.getItem(carryoverKey(year)) ?? 'null');
    if (value && Number.isInteger(value.expiryMonth) && value.expiryMonth >= 1 && value.expiryMonth <= 12) {
      return { days: safeDays(value.days), expiryMonth: value.expiryMonth, year };
    }
  } catch { /* Corrupt or legacy unscoped balances must not silently become a new year's credit. */ }
  return { days: 0, expiryMonth: 0, year };
};
export const setCarryover = (days: number, expiryMonth: number, year = new Date().getFullYear()): void => {
  localStorage.removeItem('pto-carryover-days');
  localStorage.removeItem('pto-carryover-expiry-month');
  if (days <= 0 || !Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) {
    localStorage.removeItem(carryoverKey(year));
  } else {
    localStorage.setItem(carryoverKey(year), JSON.stringify({ days: safeDays(days), expiryMonth, year }));
  }
};

export const isCarryoverUsable = (expiryMonth: number, asOfDate = new Date(), year = asOfDate.getFullYear()): boolean => {
  if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) return false;
  // Exclusive midnight of the following month includes the entire expiry day.
  return asOfDate < new Date(year, expiryMonth, 1);
};

export const getPTOBalanceForYear = (year: number, asOfDate = new Date(), total = getTotalPTODaysForYear(year), proposedDates: string[] = []) => {
  const usedDates = [...new Set([...savedLeaveDates(year), ...proposedDates.filter(isSafeIsoDate).filter(date => Number(date.slice(0, 4)) === year)])];
  const carryover = getCarryover(year);
  const eligibleUsed = usedDates.filter(date => Number(date.slice(5, 7)) <= carryover.expiryMonth).length;
  const carryoverUsed = Math.min(carryover.days, eligibleUsed);
  const annualUsed = usedDates.length - carryoverUsed;
  const annualRemaining = Math.max(0, total - annualUsed);
  const carryoverRemaining = isCarryoverUsable(carryover.expiryMonth, asOfDate, year)
    ? Math.max(0, carryover.days - carryoverUsed) : 0;
  return { annualTotal: total, annualUsed, annualRemaining, carryoverUsed, carryoverRemaining, available: annualRemaining + carryoverRemaining };
};
export const getRemainingPTODaysForYear = (year: number, total?: number): number => getPTOBalanceForYear(year, new Date(), total).annualRemaining;
export const getRemainingPTODays = (): number => getRemainingPTODaysForYear(new Date().getFullYear());
export const getEffectiveAvailablePTODays = (asOfDate = new Date(), year = asOfDate.getFullYear()): number => getPTOBalanceForYear(year, asOfDate).available;

/** Validate the union of saved and proposed leave. Editing replaces the current plan allocation. */
export const canAllocatePTODates = (dates: string[], year: number, excludePlanId?: string): boolean => {
  if (dates.some(date => !isSafeIsoDate(date) || Number(date.slice(0, 4)) !== year)) return false;
  const carryover = getCarryover(year);
  return canAllocateLeaveDates([...savedLeaveDates(year, excludePlanId), ...dates], getTotalPTODaysForYear(year) + carryover.days, carryover);
};
export const hasSavedPlansWithPTO = (): boolean => getAllPlans().some(plan => getTotalPTODaysForYear(plan.year) > 0);
export const resetPTOTracking = (): void => {
  localStorage.removeItem(TOTAL_PTO_KEY);
  localStorage.removeItem(INITIAL_PTO_KEY);
};
export const resetAllPTOData = (): void => {
  const keys = [TOTAL_PTO_KEY, INITIAL_PTO_KEY, AVAILABLE_PTO_INPUT_KEY, 'pto-carryover-days', 'pto-carryover-expiry-month'];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && /^(total-pto-days|pto-carryover)-\d{4}$/.test(key)) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
};
export const getAvailablePTODaysInput = (): number => safeDays(localStorage.getItem(AVAILABLE_PTO_INPUT_KEY));
export const setAvailablePTODaysInput = (value: number): void => localStorage.setItem(AVAILABLE_PTO_INPUT_KEY, String(safeDays(value)));
