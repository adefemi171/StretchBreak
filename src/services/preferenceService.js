import { getAllPlans } from './planStorage';
const STORAGE_KEY = 'user-preferences';
export const getUserPreferences = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    }
    catch (error) {
        console.error('Error reading preferences:', error);
    }
    // Return default preferences
    return {
        preferredMonths: [],
        typicalDuration: 5,
        efficiencyGoal: 1.5,
        pastPlans: [],
    };
};
export const updatePreferencesFromPlan = (_plan) => {
    const plans = getAllPlans();
    // Extract preferred months from all plans
    const months = new Set();
    plans.forEach(p => {
        p.vacationDays.forEach(dateStr => {
            const date = new Date(dateStr);
            months.add(date.getMonth());
        });
    });
    // Calculate typical duration
    const durations = plans.map(p => p.vacationDays.length);
    const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 5;
    // Calculate average efficiency
    const efficiencies = plans.map(p => {
        const totalDays = p.vacationDays.length + p.publicHolidays.length;
        return totalDays / p.vacationDays.length;
    });
    const avgEfficiency = efficiencies.length > 0
        ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
        : 1.5;
    const updated = {
        preferredMonths: Array.from(months),
        typicalDuration: Math.round(avgDuration),
        efficiencyGoal: avgEfficiency,
        pastPlans: plans.map(p => p.id),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
export const savePreferences = (preferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
};
