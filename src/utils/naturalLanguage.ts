import { parseISO, getMonth, isPast, startOfDay, isSameDay } from 'date-fns';
import type { PlanSuggestion } from './types';

export interface NaturalLanguageRequest {
  raw: string;
  months: number[];
  minDaysOff?: number;
  maxVacationDays?: number;
  preferLongWeekend: boolean;
  preferExtended: boolean;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const SEASON_MONTHS: Record<string, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

/** Parse plain-English vacation requests into filters for local suggestions. */
export const parseNaturalLanguageRequest = (input: string): NaturalLanguageRequest => {
  const raw = input.trim();
  const text = raw.toLowerCase();
  const months = new Set<number>();

  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      months.add(month);
    }
  }

  let season: NaturalLanguageRequest['season'];
  for (const [name, seasonMonths] of Object.entries(SEASON_MONTHS)) {
    if (text.includes(name)) {
      season = name === 'autumn' ? 'fall' : (name as NaturalLanguageRequest['season']);
      seasonMonths.forEach((m) => months.add(m));
    }
  }

  const dayMatch =
    text.match(/(\d+)\s*(?:pto|vacation|leave)?\s*days?/) ||
    text.match(/(?:use|take|spend)\s+(\d+)/) ||
    text.match(/(\d+)\s*-?\s*day/);

  const maxVacationDays = dayMatch ? Number(dayMatch[1]) : undefined;

  const offMatch = text.match(/(\d+)\s*days?\s*off/);
  const minDaysOff = offMatch ? Number(offMatch[1]) : undefined;

  const preferLongWeekend =
    /long\s*weekend|bridge|3\s*-?\s*day|4\s*-?\s*day|short\s*break|mini\s*break/.test(text);
  const preferExtended =
    /extended|long\s*trip|two\s*weeks?|10\s*-?\s*day|week\s*long|full\s*week|vacation/.test(text);

  return {
    raw,
    months: Array.from(months),
    minDaysOff,
    maxVacationDays,
    preferLongWeekend,
    preferExtended,
    season,
  };
};

export const filterSuggestionsByRequest = (
  suggestions: PlanSuggestion[],
  request: NaturalLanguageRequest
): PlanSuggestion[] => {
  const today = startOfDay(new Date());

  let filtered = suggestions.filter((s) => {
    const start = parseISO(s.startDate);
    const futureOrToday = !isPast(start) || isSameDay(start, today);
    if (!futureOrToday) return false;

    if (request.months.length > 0) {
      const month = getMonth(start) + 1;
      if (!request.months.includes(month)) return false;
    }

    if (request.maxVacationDays !== undefined && s.vacationDaysUsed > request.maxVacationDays) {
      return false;
    }

    if (request.minDaysOff !== undefined && s.totalDaysOff < request.minDaysOff) {
      return false;
    }

    return true;
  });

  if (request.preferLongWeekend) {
    filtered = [...filtered].sort((a, b) => {
      const aShort = a.vacationDaysUsed <= 3 ? 1 : 0;
      const bShort = b.vacationDaysUsed <= 3 ? 1 : 0;
      if (bShort !== aShort) return bShort - aShort;
      return b.efficiency - a.efficiency;
    });
  } else if (request.preferExtended) {
    filtered = [...filtered].sort((a, b) => {
      if (b.totalDaysOff !== a.totalDaysOff) return b.totalDaysOff - a.totalDaysOff;
      return b.efficiency - a.efficiency;
    });
  } else {
    filtered = [...filtered].sort((a, b) => b.efficiency - a.efficiency);
  }

  return filtered;
};

export const describeRequest = (request: NaturalLanguageRequest): string => {
  const parts: string[] = [];
  if (request.season) parts.push(request.season);
  if (request.months.length > 0 && !request.season) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    parts.push(request.months.map((m) => names[m]).join(', '));
  }
  if (request.maxVacationDays) parts.push(`≤${request.maxVacationDays} PTO days`);
  if (request.minDaysOff) parts.push(`≥${request.minDaysOff} days off`);
  if (request.preferLongWeekend) parts.push('long weekends');
  if (request.preferExtended) parts.push('longer breaks');
  return parts.length > 0 ? parts.join(' · ') : 'best overall stretches';
};
