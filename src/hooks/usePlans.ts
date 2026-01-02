import { useState, useEffect } from 'react';
import { getAllPlans, savePlan, deletePlan as deletePlanStorage } from '../services/planStorage';
import { updatePreferencesFromPlan } from '../services/preferenceService';
import type { HolidayPlan } from '../utils/types';

export const usePlans = () => {
  const [plans, setPlans] = useState<HolidayPlan[]>([]);
  
  useEffect(() => {
    loadPlans();
  }, []);
  
  const loadPlans = () => {
    const allPlans = getAllPlans();
    setPlans(allPlans);
  };
  
  const addPlan = (plan: HolidayPlan) => {
    savePlan(plan);
    updatePreferencesFromPlan(plan);
    loadPlans();
  };
  
  const updatePlan = (plan: HolidayPlan) => {
    savePlan(plan);
    updatePreferencesFromPlan(plan);
    loadPlans();
  };
  
  const deletePlan = (id: string) => {
    deletePlanStorage(id);
    loadPlans();
  };
  
  return { plans, addPlan, updatePlan, deletePlan, loadPlans };
};

