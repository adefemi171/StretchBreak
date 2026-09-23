import { useState, useCallback } from 'react';
import { getAllPlans, savePlan, deletePlan as deletePlanStorage } from '../services/planStorage';
import { updatePreferencesFromPlan } from '../services/preferenceService';
import type { HolidayPlan } from '../utils/types';

export const usePlans = () => {
  const [plans, setPlans] = useState<HolidayPlan[]>(getAllPlans);
  
  
  const loadPlans = useCallback(() => {
    const allPlans = getAllPlans();
    setPlans(allPlans);
  }, []);
  
  const addPlan = useCallback((plan: HolidayPlan) => {
    savePlan(plan);
    updatePreferencesFromPlan(plan);
    loadPlans();
  }, [loadPlans]);
  
  const updatePlan = useCallback((plan: HolidayPlan) => {
    savePlan(plan);
    updatePreferencesFromPlan(plan);
    loadPlans();
  }, [loadPlans]);
  
  const deletePlan = useCallback((id: string) => {
    deletePlanStorage(id);
    loadPlans();
  }, [loadPlans]);
  
  return { plans, addPlan, updatePlan, deletePlan, loadPlans };
};

