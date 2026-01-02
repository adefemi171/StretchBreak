import type { HolidayPlan } from '../utils/types';

const STORAGE_KEY = 'holiday-plans';

export const savePlan = (plan: HolidayPlan): void => {
  const plans = getAllPlans();
  const existingIndex = plans.findIndex(p => p.id === plan.id);
  
  if (existingIndex >= 0) {
    plans[existingIndex] = { ...plan, updatedAt: new Date().toISOString() };
  } else {
    plans.push(plan);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const getAllPlans = (): HolidayPlan[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading plans from storage:', error);
    return [];
  }
};

export const getPlanById = (id: string): HolidayPlan | null => {
  const plans = getAllPlans();
  return plans.find(p => p.id === id) || null;
};

export const deletePlan = (id: string): void => {
  const plans = getAllPlans();
  const filtered = plans.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const createPlanId = (): string => {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const clearAllPlans = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

