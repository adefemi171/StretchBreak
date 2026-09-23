import { useState } from 'react';
import { getUserPreferences, updatePreferencesFromPlan } from '../services/preferenceService';
import type { UserPreferences, HolidayPlan } from '../utils/types';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences);
  
  
  const updateFromPlan = (plan: HolidayPlan) => {
    updatePreferencesFromPlan(plan);
    setPreferences(getUserPreferences());
  };
  
  return { preferences, updateFromPlan };
};

