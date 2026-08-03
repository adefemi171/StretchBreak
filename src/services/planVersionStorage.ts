import type { PlanVersion, HolidayPlan } from '../utils/types';

const STORAGE_KEY = 'stretchbreak-plan-versions';

export const getAllVersions = (): PlanVersion[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const getVersionsByPlanId = (planId: string): PlanVersion[] => {
  const allVersions = getAllVersions();
  return allVersions
    .filter(v => v.planId === planId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveVersion = (planId: string, label: string, snapshot: HolidayPlan): PlanVersion => {
  const versions = getAllVersions();
  
  const newVersion: PlanVersion = {
    id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    planId,
    label,
    snapshot: { ...snapshot },
    createdAt: new Date().toISOString(),
  };
  
  versions.push(newVersion);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  
  return newVersion;
};

export const deleteVersion = (id: string): void => {
  const versions = getAllVersions();
  const filtered = versions.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const restoreVersion = (id: string): HolidayPlan | null => {
  const versions = getAllVersions();
  const version = versions.find(v => v.id === id);
  return version ? { ...version.snapshot } : null;
};
