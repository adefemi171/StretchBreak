import type { VacationBudget } from '../utils/types';

const STORAGE_KEY = 'vacation-budgets';

export const createBudgetId = (): string => {
  return `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const saveBudget = (budget: VacationBudget): void => {
  const budgets = getAllBudgets();
  const existingIndex = budgets.findIndex(b => b.id === budget.id);
  
  if (existingIndex >= 0) {
    budgets[existingIndex] = { ...budget, updatedAt: new Date().toISOString() };
  } else {
    budgets.push(budget);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
};

export const getAllBudgets = (): VacationBudget[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

export const getBudgetById = (id: string): VacationBudget | null => {
  const budgets = getAllBudgets();
  return budgets.find(b => b.id === id) || null;
};

export const getBudgetsByPlanId = (planId: string): VacationBudget[] => {
  const budgets = getAllBudgets();
  return budgets.filter(b => b.planId === planId);
};

export const deleteBudget = (id: string): void => {
  const budgets = getAllBudgets();
  const filtered = budgets.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const clearAllBudgets = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
