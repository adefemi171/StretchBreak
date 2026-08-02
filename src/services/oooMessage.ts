import type { HolidayPlan } from '../utils/types';
import { formatDateDisplay, parseDateString } from '../utils/dateUtils';

const getNetlifyFunctionUrl = (functionName: string): string => {
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
  } catch {
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
  const allVacationDays = new Set<string>();

  plan.vacationDays.forEach(day => allVacationDays.add(day));

  if (options?.allSavedPlans) {
    options.allSavedPlans.forEach(savedPlan => {
      savedPlan.vacationDays.forEach(day => allVacationDays.add(day));
    });
  }

  if (options?.currentSelectedDates) {
    options.currentSelectedDates.forEach(day => allVacationDays.add(day));
  }

  if (allVacationDays.size === 0) {
    return 'No vacation days selected.';
  }

  const sortedDates = Array.from(allVacationDays).sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

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
