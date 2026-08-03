import type { HolidayPlan, VacationTemplate } from '../utils/types';
import { validateSharedPlan, validateSharedTemplate } from '../utils/importValidation';

export const encodePlanForSharing = (plan: HolidayPlan): string => {
  const shareablePlan = {
    name: plan.name,
    description: plan.description,
    countryCode: plan.countryCode,
    year: plan.year,
    vacationDays: plan.vacationDays,
    publicHolidays: plan.publicHolidays.map((h) => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
    })),
  };

  try {
    const jsonString = JSON.stringify(shareablePlan);
    return btoa(encodeURIComponent(jsonString));
  } catch {
    throw new Error('Failed to encode plan for sharing');
  }
};

export const decodeSharedPlan = (encoded: string): Partial<HolidayPlan> | null => {
  try {
    if (encoded.length > 200_000) return null;
    const jsonString = decodeURIComponent(atob(encoded));
    const plan = JSON.parse(jsonString);
    return validateSharedPlan(plan);
  } catch {
    return null;
  }
};

export const generateShareUrl = (plan: HolidayPlan): string => {
  const encoded = encodePlanForSharing(plan);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?share=${encoded}`;
};

export const getSharedPlanFromUrl = (): Partial<HolidayPlan> | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const shareParam = urlParams.get('share');

  if (!shareParam) {
    return null;
  }

  return decodeSharedPlan(shareParam);
};

/** Local template share — encodes template prefs into the URL (not a cloud marketplace). */
export const encodeTemplateForSharing = (template: VacationTemplate): string => {
  const payload = {
    kind: 'stretchbreak-template' as const,
    name: template.name,
    description: template.description,
    strategy: template.strategy,
    preferredMonths: template.preferredMonths,
    typicalDurationDays: template.typicalDurationDays,
  };
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch {
    throw new Error('Failed to encode template for sharing');
  }
};

export const decodeSharedTemplate = (
  encoded: string
): Omit<VacationTemplate, 'id' | 'isBuiltIn'> | null => {
  try {
    if (encoded.length > 50_000) return null;
    const parsed = JSON.parse(decodeURIComponent(atob(encoded)));
    return validateSharedTemplate(parsed);
  } catch {
    return null;
  }
};

export const generateTemplateShareUrl = (template: VacationTemplate): string => {
  const encoded = encodeTemplateForSharing(template);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?template=${encoded}`;
};

export const getSharedTemplateFromUrl = (): Omit<VacationTemplate, 'id' | 'isBuiltIn'> | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const param = urlParams.get('template');
  if (!param) return null;
  return decodeSharedTemplate(param);
};

export const exportTemplateJson = (template: VacationTemplate): string => {
  return JSON.stringify(
    {
      kind: 'stretchbreak-template',
      name: template.name,
      description: template.description,
      strategy: template.strategy,
      preferredMonths: template.preferredMonths,
      typicalDurationDays: template.typicalDurationDays,
    },
    null,
    2
  );
};

export const parseTemplateJson = (
  raw: string
): Omit<VacationTemplate, 'id' | 'isBuiltIn'> | null => {
  try {
    if (raw.length > 50_000) return null;
    const parsed = JSON.parse(raw);
    return validateSharedTemplate(parsed);
  } catch {
    return null;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch {
    return false;
  }
};
