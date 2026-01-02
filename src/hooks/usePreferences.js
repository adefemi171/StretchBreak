import { useState, useEffect } from 'react';
import { getUserPreferences, updatePreferencesFromPlan } from '../services/preferenceService';
export const usePreferences = () => {
    const [preferences, setPreferences] = useState(getUserPreferences());
    useEffect(() => {
        setPreferences(getUserPreferences());
    }, []);
    const updateFromPlan = (plan) => {
        updatePreferencesFromPlan(plan);
        setPreferences(getUserPreferences());
    };
    return { preferences, updateFromPlan };
};
