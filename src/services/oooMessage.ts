import type { HolidayPlan } from '../utils/types';
import { formatDateDisplay, parseDateString } from '../utils/dateUtils';

// Netlify Functions base URL
// When using netlify dev, functions are proxied to the same origin
const getApiBaseUrl = () => {
  return '/.netlify/functions';
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
    const response = await fetch(`${getApiBaseUrl()}/generate-ooo-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan,
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
      const error = await response.json();
      console.error('Error generating AI OOO message:', error);
      return generateOOOMessageTemplate(plan, startDate, endDate, options);
    }

    const data = await response.json();
    return data.message || generateOOOMessageTemplate(plan, startDate, endDate, options);
  } catch (error) {
    console.error('Error generating AI OOO message:', error);
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
  }
): Promise<string> => {
  if (plan.vacationDays.length === 0) {
    return 'No vacation days selected.';
  }
  
  const sortedDates = [...plan.vacationDays].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  
  return generateOOOMessageAI(plan, startDate, endDate, options);
};
