import test from 'node:test';
import assert from 'node:assert/strict';
import { guardAIRequest, isAIConfigured, createSession, verifySession, sessionCookie, getClientIp, getAllowedOrigins, mutateLedger, reserveSpend, commitUsage, limitSessionAttempts, SESSION_SECONDS } from '../netlify/functions/_shared/aiGuard.js';
import { parsePlanningContext, planningToday, loadPlanningHolidays, buildCandidates, validateRanking, validDate } from '../netlify/functions/_shared/aiPlanning.js';
import { challengeMatches, verifyChallenge } from '../netlify/functions/ai-session.js';

const env = { AI_ENABLED: 'true', OPENAI_API_KEY: 'test-not-a-key', AI_SESSION_SECRET: 'test-secret-at-least-32-characters-long', TURNSTILE_SECRET_KEY: 'test', TURNSTILE_SITE_KEY: 'test', ALLOWED_ORIGINS: 'https://planner.test', CONTEXT: 'production', AI_MONTHLY_COST_LIMIT_USD: '10' };
Object.assign(process.env, env);
delete process.env.NETLIFY_DEV;
const event = () => ({ httpMethod: 'POST', headers: { origin: 'https://planner.test', 'content-type': 'application/json', 'x-nf-client-connection-ip': '203.0.113.10' }, body: '{}' });
function memoryStore(initial = null) {
  let data = initial;
  let version = initial ? 1 : 0;
  return {
    async getWithMetadata() { return data === null ? null : { data: structuredClone(data), etag: String(version) }; },
    async setJSON(_key, next, options) {
      if (options.onlyIfNew ? data !== null : options.onlyIfMatch !== String(version)) return { modified: false };
      data = structuredClone(next); version++; return { modified: true };
    },
    inspect() { return data; },
  };
}

test('runtime configuration rejects unsafe credentials and explicit preview contexts before storage access', async () => {
  assert.equal(isAIConfigured(), true);
  for (const mutation of [
    { OPENAI_API_KEY: 'your-provider-key' }, { OPENAI_API_KEY: '   ' },
    { AI_SESSION_SECRET: 'x'.repeat(64) }, { AI_SESSION_SECRET: 'replace-this-with-a-random-secret-0123456789' },
    { TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
    { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
    { TURNSTILE_SECRET_KEY: ' your-turnstile-secret ' },
    { ALLOWED_ORIGINS: 'https://planner.test,https://*.test' },
    { ALLOWED_ORIGINS: 'https://planner.test,https://localhost' },
    { CONTEXT: 'deploy-preview' }, { CONTEXT: 'branch-deploy' }, { CONTEXT: 'dev' },
    { NETLIFY_DEV: 'true', CONTEXT: 'production' },
    { NETLIFY_DEV: 'true', CONTEXT: 'deploy-preview' },
  ]) {
    try {
      Object.assign(process.env, mutation);
      assert.equal(isAIConfigured(), false, Object.keys(mutation).join(', '));
      const request = event(); request.body = '{"ping":true}';
      // A forbidden configuration returns before even connecting to shared storage.
      Object.defineProperty(request, 'blobs', { get() { assert.fail('Unsafe configuration reached storage'); } });
      assert.equal((await guardAIRequest(request)).statusCode, 503);
    } finally {
      Object.assign(process.env, env);
      delete process.env.NETLIFY_DEV;
    }
  }
});

test('Netlify Dev permits dummy widgets only in local contexts and production runtime can omit CONTEXT', () => {
  try {
    delete process.env.CONTEXT;
    assert.equal(isAIConfigured(), true);
    process.env.NETLIFY_DEV = 'true';
    process.env.TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
    process.env.ALLOWED_ORIGINS = 'http://localhost:8888';
    for (const context of ['', 'dev']) {
      process.env.CONTEXT = context;
      assert.equal(isAIConfigured(), true);
      assert.ok(getAllowedOrigins().has('http://localhost:8888'));
      assert.doesNotMatch(sessionCookie('token'), /Secure;/);
    }
    process.env.CONTEXT = 'branch-deploy';
    assert.equal(isAIConfigured(), false);
    assert.equal(getAllowedOrigins().has('http://localhost:8888'), false);
    assert.match(sessionCookie('token'), /Secure;/);
  } finally {
    Object.assign(process.env, env);
    delete process.env.NETLIFY_DEV;
  }
});

test('production origins and trusted identity ignore arbitrary forwarded IPs', () => {
  assert.equal(getAllowedOrigins().has('http://localhost:5173'), false);
  process.env.ALLOWED_ORIGINS = 'https://planner.test,https://localhost,https://127.0.0.1';
  assert.equal(getAllowedOrigins().has('https://localhost'), false);
  assert.equal(getAllowedOrigins().has('https://127.0.0.1'), false);
  process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;
  const request = event(); request.headers['x-forwarded-for'] = '198.51.100.22';
  assert.equal(getClientIp(request), '203.0.113.10');
  delete request.headers['x-nf-client-connection-ip'];
  assert.throws(() => getClientIp(request));
});

test('session signatures, expiry and connection binding are enforced', () => {
  const request = event(); const now = Date.now();
  const token = createSession(request, now);
  request.headers.cookie = sessionCookie(token);
  assert.ok(verifySession(request, now));
  assert.equal(verifySession(request, now + SESSION_SECONDS * 1000), null);
  request.headers['x-nf-client-connection-ip'] = '203.0.113.11';
  assert.equal(verifySession(request, now), null);
  request.headers['x-nf-client-connection-ip'] = '203.0.113.10';
  request.headers.cookie = sessionCookie(`${token.slice(0, -1)}!`);
  assert.equal(verifySession(request, now), null);
  assert.match(sessionCookie(token), /HttpOnly; Secure; SameSite=Strict; Path=\//);
});

test('a bot challenge must succeed for the exact hostname and AI action', () => {
  const good = { success: true, hostname: 'planner.test', action: 'ai-access' };
  assert.equal(challengeMatches(good, 'https://planner.test'), true);
  assert.equal(challengeMatches({ ...good, hostname: 'attacker.example' }, 'https://planner.test'), false);
  assert.equal(challengeMatches({ ...good, action: 'different-form' }, 'https://planner.test'), false);
  assert.equal(challengeMatches({ ...good, success: false }, 'https://planner.test'), false);
});

test('Siteverify replay/expiry failure is not cached as success and outage rejects access', async () => {
  let calls = 0;
  const mock = async (_url, options) => {
    assert.equal(JSON.parse(options.body).response, 'single-use-token');
    calls++;
    return { ok: true, json: async () => calls === 1 ? { success: true, hostname: 'planner.test', action: 'ai-access' } : { success: false, 'error-codes': ['timeout-or-duplicate'] } };
  };
  assert.equal(await verifyChallenge('single-use-token', event(), mock), true);
  assert.equal(await verifyChallenge('single-use-token', event(), mock), false);
  assert.equal(calls, 2);
  await assert.rejects(verifyChallenge('token', event(), async () => ({ ok: false })), /unavailable/);
});

test('session mint attempts share a durable per-IP limit across sessions', async () => {
  const store = memoryStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const request = event(); request.headers['x-forwarded-for'] = `198.51.100.${attempt}`;
    assert.equal(await limitSessionAttempts(request, store), attempt < 5);
  }
});

test('invalid request bodies and unconfigured readiness never authorize AI', async () => {
  const request = event(); request.body = '[]';
  assert.equal((await guardAIRequest(request)).statusCode, 400);
  request.body = JSON.stringify({ text: '😀'.repeat(7000) });
  assert.equal((await guardAIRequest(request)).statusCode, 413);
  request.body = '{"ping":true}'; process.env.AI_ENABLED = 'false';
  assert.equal((await guardAIRequest(request)).statusCode, 503);
  process.env.AI_ENABLED = 'true';
  // There is no Blobs environment in this test: an unavailable durable store fails closed.
  assert.equal((await guardAIRequest(request)).statusCode, 503);
});

test('CAS conflicts retry without lost updates; storage failures never use memory', async () => {
  const store = memoryStore();
  await Promise.all(Array.from({ length: 5 }, () => mutateLedger({}, (ledger) => ({ ...ledger, spentUsd: ledger.spentUsd + 1 }), store)));
  assert.equal(store.inspect().spentUsd, 5);
  await assert.rejects(mutateLedger({}, (ledger) => ledger, { getWithMetadata: async () => { throw new Error('offline'); } }), /offline/);
  await assert.rejects(mutateLedger({}, (ledger) => ledger, { getWithMetadata: async () => null, setJSON: async () => ({ modified: false }) }), /contention/);
});

test('legacy spend is preserved and malformed ledger blocks spending', async () => {
  const store = memoryStore({ spentUsd: 3, reservedUsd: 2 });
  await mutateLedger({}, (ledger) => ledger, store);
  assert.equal(store.inspect().spentUsd, 5);
  await assert.rejects(mutateLedger({}, (ledger) => ledger, memoryStore({ spentUsd: -1 })), /Invalid/);
});

test('shared concurrent requests cannot exceed the monthly reservation budget', async () => {
  const store = memoryStore(); process.env.AI_MONTHLY_COST_LIMIT_USD = '0.03';
  const requests = [event(), event()];
  requests.forEach((request, i) => { request._aiGuard = { session: { id: `session-${i}` } }; });
  const results = await Promise.all(requests.map((request) => reserveSpend('gpt-4o-mini', request, store)));
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(Object.values(store.inspect().reservations).reduce((sum, item) => sum + item.amount, 0), 0.02);
  process.env.AI_MONTHLY_COST_LIMIT_USD = '10';
});

test('shared per-connection concurrency cannot be bypassed with forwarded headers', async () => {
  const store = memoryStore();
  for (let index = 0; index < 3; index++) {
    const request = event(); request.headers['x-forwarded-for'] = `198.51.100.${index}`;
    request._aiGuard = { session: { id: `session-${index}` } };
    assert.equal((await reserveSpend('gpt-4o-mini', request, store)).ok, index < 2);
  }
});

test('settlement charges actual usage; uncertain or failed accounting retains reservation', async () => {
  const store = memoryStore(); const request = event(); request._aiGuard = { session: { id: 'session' } };
  const reservation = await reserveSpend('gpt-4o-mini', request, store);
  await assert.rejects(commitUsage({ model: 'gpt-4o-mini', reservation, event: request }, store), /Missing AI usage/);
  assert.equal(Object.keys(store.inspect().reservations).length, 1);
  const failedStore = { ...store, setJSON: async () => { throw new Error('storage failed'); } };
  await assert.rejects(commitUsage({ model: 'gpt-4o-mini', promptTokens: 100, completionTokens: 100, reservation, event: request }, failedStore), /storage failed/);
  assert.equal(Object.keys(store.inspect().reservations).length, 1);
  await commitUsage({ model: 'gpt-4o-mini', promptTokens: 100, completionTokens: 100, reservation, event: request }, store);
  assert.equal(Object.keys(store.inspect().reservations).length, 0);
  assert.equal(store.inspect().spentUsd, 0.000075);
});

const context = () => parsePlanningContext({ year: 2026, countryCode: 'GB', availablePTODays: 2, selectedRegions: ['GB-ENG'], startDate: '2026-12-01', endDate: '2026-12-31' }, '2026-09-22');
const holiday = (date, extra = {}) => ({ date, name: 'Holiday', localName: 'Holiday', countryCode: 'GB', fixed: false, global: true, counties: null, launchYear: null, types: ['Public'], ...extra });

test('planning input rejects impossible dates, excessive PTO and invalid schedules', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.throws(() => parsePlanningContext({ year: 2026, countryCode: 'GB', availablePTODays: -1 }, '2026-01-01'));
  assert.throws(() => parsePlanningContext({ year: 2026, countryCode: 'GB', availablePTODays: 2, workDays: [1, 1] }, '2026-01-01'));
});

test('server computes today in the browser timezone without accepting a supplied date', () => {
  const instant = new Date('2026-09-23T02:00:00Z');
  assert.equal(planningToday('America/Chicago', instant), '2026-09-22');
  assert.equal(planningToday('Asia/Tokyo', instant), '2026-09-23');
  assert.throws(() => planningToday('not-a-time-zone', instant));
});

test('server holidays exclude observances and other regions; browser holiday names are ignored', async () => {
  const records = [holiday('2026-12-25'), holiday('2026-12-26', { types: ['Observance'] }), holiday('2026-12-28', { global: false, counties: ['GB-SCT'] }), holiday('2026-12-29', { global: false, counties: ['GB-ENG'] })];
  const result = await loadPlanningHolidays(context(), async (url) => {
    assert.equal(url, 'https://date.nager.at/api/v3/PublicHolidays/2026/GB');
    return { ok: true, text: async () => JSON.stringify(records) };
  });
  assert.deepEqual(result.map((item) => item.date), ['2026-12-25', '2026-12-29']);
});

test('server honors explicit holiday exclusions and nationally declared Nigeria overrides', async () => {
  const gbContext = { ...context(), excludedHolidayDates: ['2026-12-25'] };
  const result = await loadPlanningHolidays(gbContext, async () => ({ ok: true, text: async () => JSON.stringify([holiday('2026-12-25'), holiday('2026-12-28')]) }));
  assert.deepEqual(result.map((item) => item.date), ['2026-12-28']);
  const ngContext = parsePlanningContext({ year: 2026, countryCode: 'NG', availablePTODays: 2 }, '2026-01-01');
  const ngHolidays = await loadPlanningHolidays(ngContext, async () => ({ ok: true, text: async () => '[]' }));
  assert.deepEqual(ngHolidays.map((item) => item.date), ['2026-03-19', '2026-03-20', '2026-05-27', '2026-05-28', '2026-08-25']);
});

test('national-only context does not combine regional holidays', async () => {
  const result = await loadPlanningHolidays({ ...context(), selectedRegions: [] }, async () => ({ ok: true, text: async () => JSON.stringify([holiday('2026-12-25'), holiday('2026-12-28', { global: false, counties: ['GB-ENG'] }), holiday('2026-12-29', { global: false, counties: null })]) }));
  assert.deepEqual(result.map((item) => item.date), ['2026-12-25']);
});

test('AI only returns known candidates and server-computed PTO/calendar values', () => {
  const candidates = buildCandidates(context(), [holiday('2026-12-25'), holiday('2026-12-28')]);
  assert.ok(candidates.length);
  for (const item of candidates) {
    assert.ok(item.vacationDaysUsed <= 2);
    assert.equal(item.totalDaysOff, (Date.parse(item.endDate) - Date.parse(item.startDate)) / 86400000 + 1);
    assert.equal(item.efficiency, item.totalDaysOff / item.vacationDaysUsed);
  }
  assert.throws(() => validateRanking('{"candidateIds":["invented"]}', candidates));
  assert.throws(() => validateRanking('{"candidateIds":[],"totalDaysOff":999}', candidates));
  assert.throws(() => validateRanking(JSON.stringify({ candidateIds: [candidates[0].id, candidates[0].id] }), candidates));
  const result = validateRanking(JSON.stringify({ candidateIds: [candidates[0].id] }), candidates);
  assert.equal(result[0].totalDaysOff, candidates[0].totalDaysOff);
  assert.equal('id' in result[0], false);
});
