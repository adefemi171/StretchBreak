import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePlanOOOMessage, generateOOOMessageAI, getPlanOOOBreaks, getOOOReturnDate } from '../src/services/oooMessage';
import type { HolidayPlan } from '../src/utils/types';

const plan = (patch: Partial<HolidayPlan> = {}): HolidayPlan => ({
  id: 'test-plan', name: 'Private vacation', description: 'Private medical appointment', countryCode: 'US', year: 2026,
  vacationDays: ['2026-10-05', '2026-10-30'], publicHolidays: [], createdAt: '', updatedAt: '', ...patch,
});

test('OOO requires a selected connected break and never bridges working days', async () => {
  const input = plan();
  const periods = getPlanOOOBreaks(input);
  assert.equal(periods.length, 2);
  await assert.rejects(generatePlanOOOMessage(input), /Choose one vacation break/);
  const message = await generatePlanOOOMessage(input, { breakStartDate: periods[0].startDate });
  assert.match(message, /Oct 3, 2026 to Oct 5, 2026/);
  assert.match(message, /Oct 6, 2026/);
  assert.doesNotMatch(message, /Oct 30|Nov 1/);
  await assert.rejects(generateOOOMessageAI(input, periods[0].startDate, periods[1].endDate), /connected vacation break/);
});

test('OOO local template makes no network request and ignores other plan data', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
  try {
    const message = await generatePlanOOOMessage(plan({ vacationDays: ['2026-10-05'] }));
    assert.match(message, /Oct 6, 2026/);
    assert.doesNotMatch(message, /Private/);
  } finally { globalThis.fetch = original; }
});

test('OOO return date uses custom working days and company/public closures in local time', async () => {
  const input = plan({ vacationDays: ['2026-10-08'], workDays: [0, 1, 2, 3, 4], companyHolidays: [{ id: 'closure', date: '2026-10-11', name: 'Closure' }] });
  assert.equal(getOOOReturnDate(input, '2026-10-08'), '2026-10-12');
  assert.deepEqual(getPlanOOOBreaks(input).map(p => [p.startDate, p.endDate]), [['2026-10-08', '2026-10-11']]);
  assert.match(await generatePlanOOOMessage(input), /Oct 12, 2026/);
});

test('OOO AI sends only one break and options, replacing the server return-date placeholder', async () => {
  const original = globalThis.fetch;
  const input = plan({ vacationDays: ['2026-10-05'] });
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    assert.ok(init?.signal);
    assert.equal(init?.credentials, 'same-origin');
    return new Response(JSON.stringify({ message: 'I will return on [return date].' }), { status: 200 });
  };
  try {
    const message = await generatePlanOOOMessage(input, { mode: 'ai' });
    assert.equal(message, 'I will return on Oct 6, 2026.');
    assert.deepEqual(Object.keys(payload!).sort(), ['endDate', 'options', 'startDate']);
    assert.equal(payload!.startDate, '2026-10-03');
    assert.equal(payload!.endDate, '2026-10-05');
  } finally { globalThis.fetch = original; }
});

test('OOO AI failures are surfaced instead of silently substituted with a template', async () => {
  const original = globalThis.fetch;
  const input = plan({ vacationDays: ['2026-10-05'] });
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try {
    await assert.rejects(generatePlanOOOMessage(input, { mode: 'ai' }), /AI could not draft/);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: '' }), { status: 200 });
    await assert.rejects(generatePlanOOOMessage(input, { mode: 'ai' }), /invalid draft/);
  } finally { globalThis.fetch = original; }
});
