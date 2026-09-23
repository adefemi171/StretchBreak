import { normalizeHolidayFeed, applyVerifiedHolidayOverrides } from '../../../src/services/holidayPolicy.ts';
import { sanitizeUserText } from './aiGuard.js';

export class InputError extends Error {}
export const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const weekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function planningToday(timeZone = 'UTC', now = new Date()) {
  if (typeof timeZone !== 'string' || timeZone.length > 100) throw new InputError('Choose a valid timezone.');
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type) => parts.find((value) => value.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch { throw new InputError('Choose a valid timezone.'); }
}

export function parsePlanningContext(body, today = planningToday(body.timeZone)) {
  const { year, countryCode } = body;
  if (!Number.isInteger(year) || year < Number(today.slice(0, 4)) || year > Number(today.slice(0, 4)) + 5 || typeof countryCode !== 'string' || !/^[A-Z]{2}$/.test(countryCode)) throw new InputError('Choose a country and a current or future planning year.');
  const regions = body.selectedRegions ?? [];
  if (!Array.isArray(regions) || regions.length > 20 || regions.some((region) => typeof region !== 'string' || !new RegExp(`^${countryCode}-[A-Z0-9]{1,6}$`).test(region))) throw new InputError('Choose valid work regions.');
  const workDays = body.workDays ?? [1, 2, 3, 4, 5];
  if (!Array.isArray(workDays) || !workDays.length || workDays.length > 7 || new Set(workDays).size !== workDays.length || workDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new InputError('Choose valid working days.');
  const budget = body.availablePTODays;
  if (!Number.isInteger(budget) || budget < 0 || budget > 366) throw new InputError('Choose a valid remaining PTO budget.');
  const startDate = body.startDate ?? `${year}-01-01`;
  const endDate = body.endDate ?? `${year}-12-31`;
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate || !startDate.startsWith(`${year}-`) || !endDate.startsWith(`${year}-`)) throw new InputError('Choose a valid planning date range.');
  const companyHolidays = body.companyHolidays ?? [];
  if (!Array.isArray(companyHolidays) || companyHolidays.length > 60 || companyHolidays.some((holiday) => !validDate(holiday?.date) || !holiday.date.startsWith(`${year}-`))) throw new InputError('Choose valid employer holiday dates.');
  const excludedHolidayDates = body.excludedHolidayDates ?? [];
  if (!Array.isArray(excludedHolidayDates) || excludedHolidayDates.length > 366 || excludedHolidayDates.some((date) => !validDate(date) || !date.startsWith(`${year}-`))) throw new InputError('Choose valid holiday exclusions.');
  return { year, countryCode, selectedRegions: regions, workDays, budget, startDate: startDate > today ? startDate : today, endDate, excludedHolidayDates, companyHolidays: companyHolidays.map((holiday) => ({ date: holiday.date, name: sanitizeUserText(holiday.name, 80) })) };
}

export async function loadPlanningHolidays(context, fetcher = fetch) {
  const response = await fetcher(`https://date.nager.at/api/v3/PublicHolidays/${context.year}/${context.countryCode}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Holiday source unavailable');
  const raw = await response.text();
  if (raw.length > 300_000) throw new Error('Holiday response too large');
  const holidays = applyVerifiedHolidayOverrides(normalizeHolidayFeed(JSON.parse(raw), context.year, context.countryCode), context.year, context.countryCode);
  return holidays.filter((holiday) => !context.excludedHolidayDates.includes(holiday.date) && holiday.types.includes('Public') && (holiday.global || (Array.isArray(holiday.counties) && holiday.counties.some((region) => context.selectedRegions.includes(region)))));
}

// AI can only select these deterministic candidates. No model-generated dates/counts enter plans.
export function buildCandidates(context, holidays) {
  const holidayDates = new Set([...holidays.map((holiday) => holiday.date), ...context.companyHolidays.map((holiday) => holiday.date)]);
  const working = (date) => context.workDays.includes(weekday(date)) && !holidayDates.has(date);
  const candidates = [];
  for (let start = context.startDate; start <= context.endDate; start = addDays(start, 1)) {
    // Begin at the earliest contiguous non-working day, or an ordinary work day.
    if (start > context.startDate && !working(addDays(start, -1))) continue;
    let vacationDaysUsed = 0;
    for (let offset = 0; offset < 21; offset++) {
      const end = addDays(start, offset);
      if (end > context.endDate) break;
      if (working(end)) vacationDaysUsed++;
      if (vacationDaysUsed > Math.min(context.budget, 10)) break;
      if (vacationDaysUsed === 0 || offset < 2 || (end < context.endDate && !working(addDays(end, 1)))) continue;
      const publicHolidaysIncluded = holidays.filter((holiday) => holiday.date >= start && holiday.date <= end);
      if (!publicHolidaysIncluded.length) continue;
      candidates.push({ startDate: start, endDate: end, vacationDaysUsed, totalDaysOff: offset + 1, efficiency: (offset + 1) / vacationDaysUsed, publicHolidaysIncluded, reason: `${offset + 1} days off using ${vacationDaysUsed} PTO days under your working schedule.` });
    }
  }
  return candidates.sort((a, b) => b.efficiency - a.efficiency || b.totalDaysOff - a.totalDaysOff || a.startDate.localeCompare(b.startDate)).slice(0, 30).map((candidate, index) => ({ ...candidate, id: `candidate-${index + 1}` }));
}

export const rankingSchema = {
  name: 'vacation_candidate_ranking', strict: true,
  schema: { type: 'object', additionalProperties: false, properties: { candidateIds: { type: 'array', items: { type: 'string' }, maxItems: 5 } }, required: ['candidateIds'] },
};
export function validateRanking(content, candidates) {
  const value = JSON.parse(content);
  if (!value || Object.keys(value).length !== 1 || !Array.isArray(value.candidateIds) || value.candidateIds.length > 5 || new Set(value.candidateIds).size !== value.candidateIds.length) throw new Error('Invalid AI ranking');
  return value.candidateIds.map((id) => {
    const match = candidates.find((candidate) => candidate.id === id);
    if (!match) throw new Error('AI selected an unknown candidate');
    const { id: _id, ...suggestion } = match;
    return suggestion;
  });
}
