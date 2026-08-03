import type { VacationTemplate } from '../utils/types';

const TEMPLATE_KEY = 'stretchbreak_vacation_templates';

const BUILT_IN_TEMPLATES: VacationTemplate[] = [
  {
    id: 'summer-break',
    name: 'Summer Break',
    description: 'Long vacation during summer months',
    strategy: 'extended',
    preferredMonths: [6, 7, 8],
    typicalDurationDays: 10,
    isBuiltIn: true,
  },
  {
    id: 'holiday-bridge',
    name: 'Holiday Bridge',
    description: 'Maximize efficiency around public holidays',
    strategy: 'long-weekends',
    preferredMonths: [],
    typicalDurationDays: 3,
    isBuiltIn: true,
  },
  {
    id: 'long-weekend-focus',
    name: 'Long Weekend Focus',
    description: 'Multiple 3-4 day weekends throughout the year',
    strategy: 'long-weekends',
    preferredMonths: [],
    typicalDurationDays: 3,
    isBuiltIn: true,
  },
  {
    id: 'year-end-trip',
    name: 'Year-End Trip',
    description: 'Extended vacation at the end of the year',
    strategy: 'extended',
    preferredMonths: [11, 12],
    typicalDurationDays: 12,
    isBuiltIn: true,
  },
];

export const getAllTemplates = (): VacationTemplate[] => {
  const userTemplates = getUserTemplates();
  return [...BUILT_IN_TEMPLATES, ...userTemplates];
};

export const getUserTemplates = (): VacationTemplate[] => {
  try {
    const stored = localStorage.getItem(TEMPLATE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as VacationTemplate[];
  } catch {
    return [];
  }
};

export const saveTemplate = (template: Omit<VacationTemplate, 'id' | 'isBuiltIn'>): VacationTemplate => {
  const templates = getUserTemplates();
  const newTemplate: VacationTemplate = {
    ...template,
    id: `template-${Date.now()}`,
    isBuiltIn: false,
  };
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  return newTemplate;
};

export const deleteTemplate = (id: string): void => {
  const templates = getUserTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(filtered));
};

export const getTemplateById = (id: string): VacationTemplate | undefined => {
  return getAllTemplates().find((t) => t.id === id);
};
