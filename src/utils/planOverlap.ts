import type { HolidayPlan } from './types';

export interface OverlapInfo {
  overlappingDates: string[];
  overlappingPlans: Array<{
    planId: string;
    planName: string;
  }>;
  overlapCount: number;
}

/**
 * Detect overlapping dates between a plan and all other plans
 */
export const detectPlanOverlaps = (
  plan: HolidayPlan,
  allPlans: HolidayPlan[]
): OverlapInfo => {
  const overlappingDates: string[] = [];
  const overlappingPlansMap = new Map<string, Set<string>>();
  
  // Normalize plan's vacation days
  const planDates = new Set<string>();
  plan.vacationDays.forEach(day => {
    if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
      planDates.add(day.trim());
    }
  });
  
  // Check against all other plans
  allPlans.forEach(otherPlan => {
    if (otherPlan.id === plan.id) return; // Skip self
    
    otherPlan.vacationDays.forEach(day => {
      if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
        const normalizedDay = day.trim();
        if (planDates.has(normalizedDay)) {
          overlappingDates.push(normalizedDay);
          
          // Track which plans share this date
          if (!overlappingPlansMap.has(normalizedDay)) {
            overlappingPlansMap.set(normalizedDay, new Set());
          }
          overlappingPlansMap.get(normalizedDay)!.add(otherPlan.id);
        }
      }
    });
  });
  
  // Get unique overlapping dates
  const uniqueOverlappingDates = [...new Set(overlappingDates)];
  
  // Collect all plans that overlap
  const overlappingPlanIds = new Set<string>();
  overlappingPlansMap.forEach(planIds => {
    planIds.forEach(id => overlappingPlanIds.add(id));
  });
  
  const overlappingPlans = allPlans
    .filter(p => overlappingPlanIds.has(p.id))
    .map(p => ({
      planId: p.id,
      planName: p.name,
    }));
  
  return {
    overlappingDates: uniqueOverlappingDates.sort(),
    overlappingPlans,
    overlapCount: uniqueOverlappingDates.length,
  };
};

/**
 * Get all overlapping dates across all plans
 */
export const getAllOverlappingDates = (plans: HolidayPlan[]): Map<string, string[]> => {
  const dateToPlans = new Map<string, string[]>();
  
  plans.forEach(plan => {
    plan.vacationDays.forEach(day => {
      if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
        const normalizedDay = day.trim();
        if (!dateToPlans.has(normalizedDay)) {
          dateToPlans.set(normalizedDay, []);
        }
        dateToPlans.get(normalizedDay)!.push(plan.id);
      }
    });
  });
  
  // Filter to only dates that appear in multiple plans
  const overlaps = new Map<string, string[]>();
  dateToPlans.forEach((planIds, date) => {
    if (planIds.length > 1) {
      overlaps.set(date, planIds);
    }
  });
  
  return overlaps;
};

