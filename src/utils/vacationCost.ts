import type { VacationBudget } from './types';

export interface CostBreakdown {
  travel: number;
  lodging: number;
  food: number;
  other: number;
  total: number;
  perDay: number;
  durationDays: number;
}

// Peak season months (June-August, mid-December)
const PEAK_MONTHS = [6, 7, 8, 12];

export const isPeakMonth = (month: number): boolean => {
  return PEAK_MONTHS.includes(month);
};

export const getSuggestedMultiplier = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.getMonth() + 1;
  const endMonth = end.getMonth() + 1;
  
  // If trip spans peak season, suggest higher multiplier
  const spansPeak = isPeakMonth(startMonth) || isPeakMonth(endMonth);
  
  return spansPeak ? 1.3 : 1.0;
};

export const calculateCost = (budget: VacationBudget): CostBreakdown => {
  const multiplier = budget.peakSeasonMultiplier || 1;
  
  const travel = budget.estimatedTravel * multiplier;
  const lodging = budget.estimatedLodging * multiplier;
  const food = budget.estimatedFood * multiplier;
  const other = budget.estimatedOther * multiplier;
  
  const total = travel + lodging + food + other;
  
  // Calculate duration in days
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
  
  const perDay = durationDays > 0 ? total / durationDays : 0;
  
  return {
    travel,
    lodging,
    food,
    other,
    total,
    perDay,
    durationDays,
  };
};

export const compareBudgets = (budgets: VacationBudget[]): Array<{
  budget: VacationBudget;
  cost: CostBreakdown;
}> => {
  return budgets.map(budget => ({
    budget,
    cost: calculateCost(budget),
  })).sort((a, b) => a.cost.total - b.cost.total);
};

export const formatCurrency = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
};
