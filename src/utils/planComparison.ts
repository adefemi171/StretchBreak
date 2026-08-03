import type { HolidayPlan } from './types';
import { calculateEfficiency } from './planningAlgorithm';
import { parseISO, format } from 'date-fns';

export interface PlanComparisonMetrics {
  plan: HolidayPlan;
  vacationDaysUsed: number;
  totalDaysOff: number;
  efficiency: number;
  dateRange: {
    start: string;
    end: string;
  };
  holidayCount: number;
}

export interface PlanComparisonDiff {
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  shared: string[];
}

export interface ComparisonResult {
  metrics: PlanComparisonMetrics[];
  bestByEfficiency: string; // plan ID
  bestByTotalDaysOff: string; // plan ID
}

/**
 * Calculate comparison metrics for a single plan
 */
export const calculatePlanMetrics = (plan: HolidayPlan): PlanComparisonMetrics => {
  const { vacationDaysUsed, totalDaysOff } = calculateEfficiency(
    plan.vacationDays,
    plan.publicHolidays
  );
  
  const efficiency = vacationDaysUsed > 0 ? totalDaysOff / vacationDaysUsed : 0;
  
  const sortedDates = [...plan.vacationDays].sort();
  const dateRange = {
    start: sortedDates.length > 0 ? sortedDates[0] : '',
    end: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : '',
  };
  
  return {
    plan,
    vacationDaysUsed,
    totalDaysOff,
    efficiency,
    dateRange,
    holidayCount: plan.publicHolidays.length,
  };
};

/**
 * Compare multiple plans and return metrics + best performers
 */
export const comparePlans = (plans: HolidayPlan[]): ComparisonResult => {
  if (plans.length < 2) {
    throw new Error('At least 2 plans are required for comparison');
  }
  
  const metrics = plans.map(calculatePlanMetrics);
  
  // Find best by efficiency
  const bestEfficiency = metrics.reduce((best, current) => 
    current.efficiency > best.efficiency ? current : best
  );
  
  // Find best by total days off
  const bestTotalDays = metrics.reduce((best, current) => 
    current.totalDaysOff > best.totalDaysOff ? current : best
  );
  
  return {
    metrics,
    bestByEfficiency: bestEfficiency.plan.id,
    bestByTotalDaysOff: bestTotalDays.plan.id,
  };
};

/**
 * Calculate the difference between two plans' vacation days
 */
export const diffVacationDays = (
  planA: HolidayPlan,
  planB: HolidayPlan
): PlanComparisonDiff => {
  const daysA = new Set(planA.vacationDays);
  const daysB = new Set(planB.vacationDays);
  
  const uniqueToFirst: string[] = [];
  const uniqueToSecond: string[] = [];
  const shared: string[] = [];
  
  planA.vacationDays.forEach(day => {
    if (daysB.has(day)) {
      shared.push(day);
    } else {
      uniqueToFirst.push(day);
    }
  });
  
  planB.vacationDays.forEach(day => {
    if (!daysA.has(day)) {
      uniqueToSecond.push(day);
    }
  });
  
  return {
    uniqueToFirst: uniqueToFirst.sort(),
    uniqueToSecond: uniqueToSecond.sort(),
    shared: shared.sort(),
  };
};

/**
 * Format date range for display
 */
export const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return 'N/A';
  
  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    const startFormatted = format(startDate, 'MMM d');
    const endFormatted = format(endDate, 'MMM d, yyyy');
    
    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return 'Invalid date';
  }
};

/**
 * Get strategy display name
 */
export const getStrategyDisplayName = (strategy?: string): string => {
  if (!strategy) return 'Custom';
  
  const strategyNames: Record<string, string> = {
    'balanced': 'Balanced Mix',
    'long-weekends': 'Long Weekends',
    'mini-breaks': 'Mini Breaks',
    'week-long': 'Week-long Breaks',
    'extended': 'Extended Vacations',
  };
  
  return strategyNames[strategy] || strategy;
};
