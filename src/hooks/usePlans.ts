import { useState, useEffect } from 'react';
import { getAllPlans, savePlan, deletePlan as deletePlanStorage } from '../services/planStorage';
import { updatePreferencesFromPlan } from '../services/preferenceService';
import { setTotalPTODays } from '../services/ptoTracking';
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
    // Save total PTO if plan has it and it's not already saved
    if (plan.availablePTODays && plan.availablePTODays > 0) {
      const existingTotal = localStorage.getItem('total-pto-days');
      if (!existingTotal || parseInt(existingTotal, 10) === 0) {
        setTotalPTODays(plan.availablePTODays);
      }
    }
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

