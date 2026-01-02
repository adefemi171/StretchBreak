import type { HolidayPlan } from '../utils/types';

export const encodePlanForSharing = (plan: HolidayPlan): string => {
  const shareablePlan = {
    name: plan.name,
    description: plan.description,
    countryCode: plan.countryCode,
    year: plan.year,
    vacationDays: plan.vacationDays,
    publicHolidays: plan.publicHolidays.map(h => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
    })),
  };
  
  try {
    const jsonString = JSON.stringify(shareablePlan);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.error('Error encoding plan:', error);
    throw new Error('Failed to encode plan for sharing');
  }
};

export const decodeSharedPlan = (encoded: string): Partial<HolidayPlan> | null => {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    const plan = JSON.parse(jsonString);
    
    if (!plan.countryCode || !plan.year || !Array.isArray(plan.vacationDays)) {
      throw new Error('Invalid plan data');
    }
    
    return plan;
  } catch (error) {
    console.error('Error decoding shared plan:', error);
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
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

