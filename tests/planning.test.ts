import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanBreakdown } from '../src/components/PlanManager/PlanBreakdown';
import assert from 'node:assert/strict';
import { calculateEfficiency, getVacationBreaks, normalizeSuggestion, getLeaveDates, canAllocateLeaveDates } from '../src/utils/planningAlgorithm';
import { optimizeByStrategy } from '../src/utils/strategyOptimizer';
import { generateICal, generateGoogleCalendarUrls, generateOutlookUrls, generateGoogleCalendarUrl } from '../src/services/calendarExport';
import { setTotalPTODaysForYear, setCarryover, getCarryover, getPTOBalanceForYear, getEffectiveAvailablePTODays, canAllocatePTODates, isCarryoverUsable } from '../src/services/ptoTracking';
import { calculateYearStats, calculateUtilizationRate } from '../src/utils/vacationAnalytics';
import type { PublicHoliday, HolidayPlan, PlanSuggestion } from '../src/utils/types';

const holiday = (date: string): PublicHoliday => ({ date, name: 'Holiday', localName: 'Holiday', countryCode: 'US', fixed: false, global: true, counties: null, launchYear: null, types: ['Public'] });
const plan = (dates: string[]): HolidayPlan => ({ id: 'test', name: 'Test vacation', year: 2026, countryCode: 'US', vacationDays: dates, publicHolidays: [], createdAt: '', updatedAt: '' });
const suggestion = (startDate: string, endDate: string): PlanSuggestion => ({ startDate, endDate, vacationDaysUsed: 999, totalDaysOff: 999, efficiency: 999, reason: 'Test', publicHolidaysIncluded: [] });
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() { return storage.size; },
} });

test('disconnected selections cannot count working days between them', () => {
  assert.deepEqual(calculateEfficiency(['2026-10-05', '2026-10-30'], []), { vacationDaysUsed: 2, totalDaysOff: 6 });
  assert.equal(getVacationBreaks(['2026-10-05', '2026-10-30'], []).length, 2);
});

test('adjacent breaks share weekends once and invalid/duplicate/nonworking dates consume no PTO', () => {
  assert.deepEqual(calculateEfficiency(['2026-10-02', '2026-10-05', '2026-10-02', '2026-10-03', '2026-02-30'], []), { vacationDaysUsed: 2, totalDaysOff: 4 });
});

test('suggestions and applied selection use the same full break and actual leave dates', () => {
  const normalized = normalizeSuggestion(suggestion('2026-12-21', '2026-12-25'), [holiday('2026-12-25')])!;
  assert.equal(normalized.startDate, '2026-12-19');
  assert.equal(normalized.endDate, '2026-12-27');
  assert.equal(normalized.vacationDaysUsed, 4);
  assert.equal(normalized.totalDaysOff, 9);
  assert.deepEqual(calculateEfficiency(normalized.leaveDates!, [holiday('2026-12-25')]), { vacationDaysUsed: 4, totalDaysOff: 9 });
});

test('custom workweeks and company holidays affect leave and adjacent days off', () => {
  const days = getLeaveDates('2026-10-02', '2026-10-04', [], [0, 1, 2, 3, 4]);
  assert.deepEqual(days, ['2026-10-04']);
  assert.deepEqual(calculateEfficiency(days, [], [0, 1, 2, 3, 4]), { vacationDaysUsed: 1, totalDaysOff: 3 });
  assert.deepEqual(calculateEfficiency(['2026-12-24'], [holiday('2026-12-25')]), { vacationDaysUsed: 1, totalDaysOff: 4 });
});

test('carryover pays only actual eligible leave, including periods crossing expiry', () => {
  const carryover = { days: 5, expiryMonth: 3, year: 2026 };
  assert.equal(canAllocateLeaveDates(['2026-03-31', '2026-04-01', '2026-04-02'], 6, carryover), false);
  assert.equal(canAllocateLeaveDates(['2026-03-30', '2026-03-31', '2026-04-01'], 6, carryover), true);
  assert.equal(isCarryoverUsable(3, new Date(2026, 2, 31, 23, 59), 2026), true);
  assert.equal(isCarryoverUsable(3, new Date(2026, 3, 1), 2026), false);
});

test('balances allocate carryover first, expire unused days and stay year scoped', () => {
  storage.clear();
  setTotalPTODaysForYear(2026, 20);
  setTotalPTODaysForYear(2027, 20);
  setCarryover(5, 3, 2026);
  assert.equal(getEffectiveAvailablePTODays(new Date(2026, 0, 1), 2026), 25);
  assert.equal(getCarryover(2027).days, 0);
  storage.set('holiday-plans', JSON.stringify([plan(['2026-03-02', '2026-03-03', '2026-04-01'])]));
  assert.deepEqual(getPTOBalanceForYear(2026, new Date(2026, 0, 1)), { annualTotal: 20, annualUsed: 1, annualRemaining: 19, carryoverUsed: 2, carryoverRemaining: 3, available: 22 });
  assert.equal(getPTOBalanceForYear(2026, new Date(2026, 3, 1)).available, 19);
  setTotalPTODaysForYear(2026, 0);
  assert.equal(canAllocatePTODates(['2026-04-02'], 2026), false);
});

test('optimizer respects company days, exact timeframe, workweek, strategy and shared budget', () => {
  const suggestions = optimizeByStrategy({ holidays: [holiday('2026-12-25')], companyHolidays: [{ id: 'h', date: '2026-12-24', name: 'Office closure' }], availablePTODays: 3,
    strategy: 'balanced', startDate: new Date(2026, 11, 19), endDate: new Date(2026, 11, 27) });
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every(s => s.startDate >= '2026-12-19' && s.endDate <= '2026-12-27'));
  assert.ok(suggestions.reduce((sum, s) => sum + s.vacationDaysUsed, 0) <= 3);
  assert.ok(suggestions.every(s => !s.leaveDates!.includes('2026-12-24') && !s.leaveDates!.includes('2026-12-25')));
  assert.deepEqual(optimizeByStrategy({ holidays: [holiday('2026-12-25')], companyHolidays: [], availablePTODays: 0, strategy: 'balanced', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 11, 31) }), []);
});

test('all-day ICS ends are exclusive, including holidays and year boundaries', () => {
  const exported = plan(['2026-12-31']);
  exported.publicHolidays = [holiday('2026-01-01')];
  const ics = generateICal(exported);
  assert.match(ics, /DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260101\r\nDTEND;VALUE=DATE:20260102/);
  assert.match(ics, /DTSTAMP:/);
});

test('calendar deep links split disconnected leave and include final selected day', () => {
  const exported = plan(['2026-10-05', '2026-10-30']);
  const google = generateGoogleCalendarUrls(exported).map(url => new URL(url));
  assert.deepEqual(google.map(url => url.searchParams.get('dates')), ['20261005/20261006', '20261030/20261031']);
  const outlook = generateOutlookUrls(exported).map(url => new URL(url));
  assert.deepEqual(outlook.map(url => url.searchParams.get('enddt')), ['2026-10-06', '2026-10-31']);
  assert.equal(generateGoogleCalendarUrl(exported), '');
});

test('analytics count overlapping plans once', () => {
  const plans = [plan(['2026-10-05']), { ...plan(['2026-10-05']), id: 'second' }];
  const stats = calculateYearStats(plans)[0];
  assert.equal(stats.ptoUsed, 1);
  assert.equal(stats.totalDaysOff, 3);
  assert.equal(calculateUtilizationRate(plans, 20), 0.05);
});


test('saved-plan breakdown displays disconnected breaks using the same union', () => {
  storage.clear();
  const html = renderToStaticMarkup(createElement(PlanBreakdown, { plan: plan(['2026-10-05', '2026-10-30']), holidays: [] }));
  assert.match(html, /Total Days Off:<\/span><span class="summary-value">6<\/span>/);
  assert.doesNotMatch(html, /summary-value">30<\/span>/);
});

test('saved-plan breakdown counts employer holiday on a rest day only once', () => {
  storage.clear();
  const saved = { ...plan(['2026-10-04']), workDays: [0, 1, 2, 3, 4], companyHolidays: [{ id: 'closure', name: 'Closure', date: '2026-10-02' }] };
  const html = renderToStaticMarkup(createElement(PlanBreakdown, { plan: saved, holidays: [] }));
  assert.match(html, /Total Days Off:<\/span><span class="summary-value">3<\/span>/);
  assert.match(html, /Public \/ Employer Holidays:<\/span><span class="summary-value holiday">1<\/span>/);
  assert.match(html, /Other Rest Days:<\/span><span class="summary-value weekend">1<\/span>/);
});

test('multi-year leave ranges are supported up to a bounded three-year window', () => {
  assert.ok(getLeaveDates('2026-01-01', '2028-12-31', []).length > 700);
  assert.deepEqual(getLeaveDates('2026-01-01', '2030-12-31', []), []);
});

test('projected balances merge saved and proposed dates without double charging overlaps', () => {
  storage.clear();
  setTotalPTODaysForYear(2026, 20);
  storage.set('holiday-plans', JSON.stringify([plan(['2026-10-05'])]));
  assert.equal(getPTOBalanceForYear(2026, new Date(2026, 8, 22), undefined, ['2026-10-05', '2026-10-30']).available, 18);
  assert.equal(getPTOBalanceForYear(2026, new Date(2026, 8, 22)).available, 19);
});
