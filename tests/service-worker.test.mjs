import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const setup = () => {
  const handlers = new Map();
  const data = new Map();
  const key = request => typeof request === 'string' ? request : request.url;
  const cache = { match: async request => data.get(key(request))?.clone(), put: async (request, response) => { data.set(key(request), response.clone()); } };
  const context = vm.createContext({
    self: { location: { origin: 'https://app.test' }, addEventListener: (type, handler) => handlers.set(type, handler) },
    caches: { open: async () => cache, match: cache.match },
    Headers, Response, URL, Date,
    fetch: async () => new Response('latest'),
  });
  vm.runInContext(source, context);
  return { context, data, dispatch: async request => {
    let response;
    const pending = [];
    handlers.get('fetch')({ request, respondWith: value => { response = value; }, waitUntil: value => pending.push(value) });
    const result = await response;
    await Promise.all(pending);
    return result;
  } };
};

test('holiday offline cache preserves retrieval time and explicitly marks stale provenance', async () => {
  const { context, dispatch } = setup();
  const request = { method: 'GET', url: 'https://date.nager.at/api/v3/PublicHolidays/2026/GB' };
  const fresh = await dispatch(request);
  const fetchedAt = fresh.headers.get('x-stretchbreak-fetched-at');
  assert.ok(Number.isFinite(Date.parse(fetchedAt)));
  assert.equal(fresh.headers.get('x-stretchbreak-offline'), null);
  context.fetch = async () => { throw new Error('offline'); };
  const cached = await dispatch(request);
  assert.equal(cached.headers.get('x-stretchbreak-fetched-at'), fetchedAt);
  assert.equal(cached.headers.get('x-stretchbreak-offline'), 'true');
});

test('navigations fetch new releases and never cache private share query URLs', async () => {
  const { context, data, dispatch } = setup();
  data.set('/index.html', new Response('old'));
  const request = { method: 'GET', mode: 'navigate', url: 'https://app.test/?share=private' };
  assert.equal(await (await dispatch(request)).text(), 'latest');
  assert.equal(data.has(request.url), false);
  context.fetch = async () => { throw new Error('offline'); };
  assert.equal(await (await dispatch(request)).text(), 'latest');
});

test('AI functions and arbitrary same-origin responses bypass cache', async () => {
  const { dispatch } = setup();
  assert.equal(await dispatch({ method: 'GET', url: 'https://app.test/.netlify/functions/ai-status' }), undefined);
  assert.equal(await dispatch({ method: 'GET', url: 'https://app.test/private-account' }), undefined);
});
