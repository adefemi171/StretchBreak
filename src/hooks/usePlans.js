import { useState, useEffect } from 'react';
import { getAllPlans, savePlan, deletePlan as deletePlanStorage } from '../services/planStorage';
import { updatePreferencesFromPlan } from '../services/preferenceService';
export const usePlans = () => {
    const [plans, setPlans] = useState([]);
    useEffect(() => {
        loadPlans();
    }, []);
    const loadPlans = () => {
        const allPlans = getAllPlans();
        setPlans(allPlans);
    };
    const addPlan = (plan) => {
        savePlan(plan);
        updatePreferencesFromPlan(plan);
        loadPlans();
    };
    const updatePlan = (plan) => {
        savePlan(plan);
        updatePreferencesFromPlan(plan);
        loadPlans();
    };
    const deletePlan = (id) => {
        deletePlanStorage(id);
        loadPlans();
    };
    return { plans, addPlan, updatePlan, deletePlan, loadPlans };
};
