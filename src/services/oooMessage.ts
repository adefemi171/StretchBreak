import type { HolidayPlan } from '../utils/types';
import { formatDateDisplay, parseDateString } from '../utils/dateUtils';

// Use Netlify Functions to proxy OpenAI API calls (API key stays server-side)
const getNetlifyFunctionUrl = (functionName: string): string => {
  // In development, use local Netlify dev server
  // In production, use the deployed function URL
  if (import.meta.env.DEV) {
    return `http://localhost:8888/.netlify/functions/${functionName}`;
  }
  return `/.netlify/functions/${functionName}`;
};

export const generateOOOMessageAI = async (
  plan: HolidayPlan,
  startDate: string,
  endDate: string,
  options: {
    includeDates?: boolean;
    includeBackDate?: boolean;
    tone?: 'professional' | 'casual' | 'brief';
  } = {}
): Promise<string> => {
  const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;

  try {
    const response = await fetch(getNetlifyFunctionUrl('generate-ooo-message'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: {
          name: plan.name,
          description: plan.description,
        },
        startDate,
        endDate,
        options: {
          includeDates,
          includeBackDate,
          tone,
        },
      }),
    });

    if (!response.ok) {
      return generateOOOMessageTemplate(plan, startDate, endDate, options);
    }

    const data = await response.json();
    return data.message || generateOOOMessageTemplate(plan, startDate, endDate, options);
  } catch (error) {
    return generateOOOMessageTemplate(plan, startDate, endDate, options);
  }
};

const generateOOOMessageTemplate = (
  _plan: HolidayPlan,
  startDate: string,
  endDate: string,
  options: {
    includeDates?: boolean;
    includeBackDate?: boolean;
    tone?: 'professional' | 'casual' | 'brief';
  } = {}
): string => {
  const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;
  
  const backDate = new Date(parseDateString(endDate));
  backDate.setDate(backDate.getDate() + 1);
  
  const dateRange = includeDates
    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
    : 'this period';
  
  const backDateStr = includeBackDate ? formatDateDisplay(backDate.toISOString().split('T')[0]) : '';
  
  let message = '';
  
  switch (tone) {
    case 'professional':
      message = `I will be out of the office ${dateRange} and will have limited access to email.`;
      if (includeBackDate) {
        message += ` I will respond to your message when I return on ${backDateStr}.`;
      }
      message += `\n\nFor urgent matters, please contact [alternative contact].`;
      break;
      
    case 'casual':
      message = `I'm taking some time off ${dateRange} and will be away from my email.`;
      if (includeBackDate) {
        message += ` I'll be back on ${backDateStr} and will catch up on messages then.`;
      }
      message += `\n\nIf it's urgent, feel free to reach out to [alternative contact].`;
      break;
      
    case 'brief':
      message = `Out of office ${dateRange}.`;
      if (includeBackDate) {
        message += ` Back ${backDateStr}.`;
      }
      message += ` For urgent matters, contact [alternative contact].`;
      break;
  }
  
  return message;
};

export const generatePlanOOOMessage = async (
  plan: HolidayPlan,
  options?: {
    includeDates?: boolean;
    includeBackDate?: boolean;
    tone?: 'professional' | 'casual' | 'brief';
    allSavedPlans?: HolidayPlan[];
    currentSelectedDates?: string[];
  }
): Promise<string> => {
  // Collect all vacation days from:
  // 1. The current plan
  // 2. All saved plans (if provided)
  // 3. Current selected dates (if provided)
  const allVacationDays = new Set<string>();
  
  // Add days from the current plan
  plan.vacationDays.forEach(day => allVacationDays.add(day));
  
  // Add days from all saved plans
  if (options?.allSavedPlans) {
    options.allSavedPlans.forEach(savedPlan => {
      savedPlan.vacationDays.forEach(day => allVacationDays.add(day));
    });
  }
  
  // Add current selected dates (from optimal vacation suggestions)
  if (options?.currentSelectedDates) {
    options.currentSelectedDates.forEach(day => allVacationDays.add(day));
  }
  
  if (allVacationDays.size === 0) {
    return 'No vacation days selected.';
  }
  
  const sortedDates = Array.from(allVacationDays).sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  
  // Create a combined plan name for the OOO message
  const totalPlansCount = (options?.allSavedPlans?.length || 0) + 1;
  const combinedPlanName = options?.allSavedPlans && options.allSavedPlans.length > 0
    ? `Vacation (${totalPlansCount} plan${totalPlansCount > 1 ? 's' : ''})`
    : plan.name;
  
  const combinedPlan: HolidayPlan = {
    ...plan,
    name: combinedPlanName,
    vacationDays: sortedDates,
  };
  
  return generateOOOMessageAI(combinedPlan, startDate, endDate, options);
};
