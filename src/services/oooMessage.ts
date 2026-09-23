import type { HolidayPlan } from '../utils/types';
import { formatDate, formatDateDisplay, isWeekendDay, parseDateString } from '../utils/dateUtils';
import { getVacationBreaks } from '../utils/planningAlgorithm';
import type { VacationBreak } from '../utils/planningAlgorithm';

export interface OOOOptions {
  includeDates?: boolean;
  includeBackDate?: boolean;
  tone?: 'professional' | 'casual' | 'brief';
  breakStartDate?: string;
  mode?: 'template' | 'ai';
}

export const getPlanOOOBreaks = (plan: HolidayPlan): VacationBreak[] =>
  getVacationBreaks(plan.vacationDays, [...plan.publicHolidays, ...(plan.companyHolidays ?? [])], plan.workDays);

export const getOOOReturnDate = (plan: HolidayPlan, endDate: string): string => {
  const date = parseDateString(endDate);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid vacation break.');
  const holidays = new Set([...plan.publicHolidays, ...(plan.companyHolidays ?? [])].map(day => day.date));
  const leave = new Set(plan.vacationDays);
  // A bounded search also handles unusual imported calendars safely.
  for (let days = 0; days < 3 * 366; days++) {
    date.setDate(date.getDate() + 1);
    const key = formatDate(date);
    if (!isWeekendDay(date, plan.workDays) && !holidays.has(key) && !leave.has(key)) return key;
  }
  throw new Error('Could not find a return-to-work date in this calendar.');
};

const assertBreak = (plan: HolidayPlan, startDate: string, endDate: string) => {
  if (!getPlanOOOBreaks(plan).some(period => period.startDate === startDate && period.endDate === endDate)) {
    throw new Error('Choose one connected vacation break for your message.');
  }
};

export const generateOOOMessageTemplate = (
  plan: HolidayPlan,
  startDate: string,
  endDate: string,
  options: OOOOptions = {},
): string => {
  assertBreak(plan, startDate, endDate);
  const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;
  const dateRange = includeDates ? `from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : 'during this period';
  const backDate = includeBackDate ? formatDateDisplay(getOOOReturnDate(plan, endDate)) : '';
  if (tone === 'casual') {
    return `I'm taking some time off ${dateRange} and will be away from my email.${includeBackDate ? ` I'll be back on ${backDate} and will catch up on messages then.` : ''}\n\nIf it's urgent, feel free to reach out to [alternative contact].`;
  }
  if (tone === 'brief') {
    return `Out of office ${dateRange}.${includeBackDate ? ` Back ${backDate}.` : ''} For urgent matters, contact [alternative contact].`;
  }
  return `I will be out of the office ${dateRange} and will have limited access to email.${includeBackDate ? ` I will respond to your message when I return on ${backDate}.` : ''}\n\nFor urgent matters, please contact [alternative contact].`;
};

export const generateOOOMessageAI = async (
  plan: HolidayPlan,
  startDate: string,
  endDate: string,
  options: OOOOptions = {},
): Promise<string> => {
  assertBreak(plan, startDate, endDate);
  const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/.netlify/functions/generate-ooo-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
      // Only the selected break and message settings leave this browser.
      body: JSON.stringify({ startDate, endDate, options: { includeDates, includeBackDate, tone } }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Verify AI access before requesting a draft.');
      if (response.status === 429) throw new Error('AI request limit reached. Try later or use the local template.');
      throw new Error('AI could not draft this message. Try again or use the local template.');
    }
    const data: unknown = await response.json();
    const message = data && typeof data === 'object' && 'message' in data ? data.message : null;
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) throw new Error('AI returned an invalid draft. Use the local template or try again.');
    return includeBackDate
      ? message.replace(/\[return date\]/gi, formatDateDisplay(getOOOReturnDate(plan, endDate)))
      : message;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('AI drafting timed out. Try again or use the local template.');
    throw error instanceof Error ? error : new Error('AI could not draft this message.');
  } finally {
    clearTimeout(timeout);
  }
};

export const generatePlanOOOMessage = async (plan: HolidayPlan, options: OOOOptions = {}): Promise<string> => {
  const breaks = getPlanOOOBreaks(plan);
  if (!breaks.length) throw new Error('Select vacation days before creating a message.');
  const period = options.breakStartDate
    ? breaks.find(candidate => candidate.startDate === options.breakStartDate)
    : breaks.length === 1 ? breaks[0] : undefined;
  if (!period) throw new Error('Choose one vacation break for your message.');
  return options.mode === 'ai'
    ? generateOOOMessageAI(plan, period.startDate, period.endDate, options)
    : generateOOOMessageTemplate(plan, period.startDate, period.endDate, options);
};
