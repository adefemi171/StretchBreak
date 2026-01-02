const STORAGE_KEY = 'holiday-plans';
export const savePlan = (plan) => {
    const plans = getAllPlans();
    const existingIndex = plans.findIndex(p => p.id === plan.id);
    if (existingIndex >= 0) {
        plans[existingIndex] = { ...plan, updatedAt: new Date().toISOString() };
    }
    else {
        plans.push(plan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};
export const getAllPlans = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored)
            return [];
        return JSON.parse(stored);
    }
    catch (error) {
        console.error('Error reading plans from storage:', error);
        return [];
    }
};
export const getPlanById = (id) => {
    const plans = getAllPlans();
    return plans.find(p => p.id === id) || null;
};
export const deletePlan = (id) => {
    const plans = getAllPlans();
    const filtered = plans.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
export const createPlanId = () => {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
