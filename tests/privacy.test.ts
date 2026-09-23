import test from 'node:test';
import assert from 'node:assert/strict';
import { importBackup, exportBackup, generateSyncCode, importFromSyncCode, clearAppStorage } from '../src/services/backupService';
import { generateShareUrl, getSharedPlanFromUrl, encodePlanForSharing } from '../src/services/shareService';
import { validateSharedPlan } from '../src/utils/importValidation';
import type { HolidayPlan } from '../src/utils/types';

class MemoryStorage {
  data = new Map<string, string>();
  failKey: string | null = null;
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === this.failKey) { this.failKey = null; throw new Error('Quota exceeded'); }
    this.data.set(key, String(value));
  }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
const plan = (id: string, name = 'Lagos 🌴 — 日本語'): HolidayPlan => ({
  id, name, countryCode: 'NG', year: 2026, vacationDays: ['2026-12-24'], publicHolidays: [],
  companyHolidays: [{ id: 'c1', name: 'Company closure', date: '2026-12-31', countryCode: 'NG' }],
  selectedRegions: ['NG-LA'], excludedHolidayDates: ['2026-10-01'], workDays: [0, 1, 2, 3, 4],
  timeframe: { type: 'custom', startDate: '2026-12-01', endDate: '2027-01-10' },
  holidaySource: { provider: 'Nager.Date', sourceUrl: 'https://date.nager.at/api/v3/PublicHolidays/2026/NG', retrievedAt: '2026-09-22T00:00:00Z', freshness: 'fresh', coverage: 'provider-unverified', policyVersion: '2026-09-22.1', overrideSources: [] },
  createdAt: '2026-09-22T00:00:00Z', updatedAt: '2026-09-22T00:00:00Z',
});
const backup = (data: Record<string, unknown>) => ({ version: '1.0', timestamp: '2026-09-22T00:00:00Z', data });
const storage = () => { const value = new MemoryStorage(); Object.defineProperty(globalThis, 'localStorage', { configurable: true, value }); return value; };

test('snapshot links use a correctly encoded fragment and preserve planning context', () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: new URL('https://example.test/planner?old=1') } });
  const original = plan('p1');
  const url = new URL(generateShareUrl(original));
  assert.equal(url.search, '');
  assert.ok(url.hash.startsWith('#share='));
  window.location = url as unknown as Location;
  const restored = getSharedPlanFromUrl();
  assert.equal(restored?.name, original.name);
  for (const key of ['companyHolidays', 'selectedRegions', 'workDays', 'excludedHolidayDates', 'timeframe', 'holidaySource'] as const) assert.deepEqual(restored?.[key], original[key]);
  window.location = new URL(`https://example.test/?share=${encodePlanForSharing(original)}`) as unknown as Location;
  assert.equal(getSharedPlanFromUrl()?.name, original.name);
});

test('invalid context is rejected instead of changing plan meaning', () => {
  assert.equal(validateSharedPlan({ ...plan('p1'), workDays: [] }), null);
  assert.equal(validateSharedPlan({ ...plan('p1'), selectedRegions: ['GB-SCT'] }), null);
  assert.equal(validateSharedPlan({ ...plan('p1'), companyHolidays: [{ date: '2026-02-30' }] }), null);
});

test('replace validates the entire backup before removing or overwriting anything', () => {
  const store = storage(); store.setItem('holiday-plans', JSON.stringify([plan('old')])); store.setItem('lastCountryCode', 'GB');
  const before = [...store.data];
  assert.throws(() => importBackup(backup({ 'holiday-plans': [plan('new'), { bad: true }], 'lastCountryCode': 'NG' }), 'replace'), /Invalid backup value/);
  assert.deepEqual([...store.data], before);
});

test('merge retains other IDs and replaces only matching imported records', () => {
  const store = storage(); store.setItem('holiday-plans', JSON.stringify([plan('old'), plan('same', 'Before')]));
  store.setItem('stretchbreak-team', JSON.stringify([{ id: 'a', name: 'A', timeOff: [] }]));
  importBackup(backup({ 'holiday-plans': [plan('same', 'After'), plan('new')], 'stretchbreak-team': [{ id: 'b', name: 'B', timeOff: ['2026-12-24'] }] }));
  const plans = JSON.parse(store.getItem('holiday-plans')!);
  assert.deepEqual(plans.map((p: HolidayPlan) => p.id), ['old', 'same', 'new']);
  assert.equal(plans[1].name, 'After');
  assert.equal(JSON.parse(store.getItem('stretchbreak-team')!).length, 2);
});

test('quota failure rolls back all writes and never reports partial success', () => {
  const store = storage(); store.setItem('holiday-plans', JSON.stringify([plan('old')])); store.setItem('lastCountryCode', 'GB');
  const before = [...store.data]; store.failKey = 'lastCountryCode';
  assert.throws(() => importBackup(backup({ 'holiday-plans': [plan('new')], 'lastCountryCode': 'NG' }), 'replace'), /previous data was restored/);
  assert.deepEqual([...store.data], before);
});

test('Unicode sync roundtrip retains year carryover and excludes webhook secrets', () => {
  const store = storage(); store.setItem('holiday-plans', JSON.stringify([plan('unicode')]));
  store.setItem('pto-carryover-2026', JSON.stringify({ year: 2026, days: 5, expiryMonth: 3 }));
  store.setItem('webhook-url', 'https://secret.invalid/token');
  const code = generateSyncCode(); assert.ok(code?.startsWith('sb1.'));
  assert.equal(exportBackup().data['webhook-url'], undefined);
  store.clear(); importFromSyncCode(code!);
  assert.equal(JSON.parse(store.getItem('holiday-plans')!)[0].name, plan('unicode').name);
  assert.deepEqual(JSON.parse(store.getItem('pto-carryover-2026')!), { year: 2026, days: 5, expiryMonth: 3 });
  assert.equal(store.getItem('webhook-url'), null);
});

test('Reset All removes dynamic app keys and secrets while keeping unrelated data', () => {
  const store = storage();
  for (const key of ['pto-carryover-2026', 'total-pto-days-2027', 'reminder-last-check', 'webhook-url', 'stretchbreak-team']) store.setItem(key, 'x');
  store.setItem('other-app', 'keep'); clearAppStorage();
  assert.deepEqual([...store.data], [['other-app', 'keep']]);
});
