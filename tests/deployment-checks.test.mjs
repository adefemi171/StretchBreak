import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAIConfig, formatConfigReport } from '../scripts/check-ai-config.mjs';
import { checkDeployment, formatDeploymentReport } from '../scripts/check-deployment.mjs';

const env = () => ({ AI_ENABLED: 'true', OPENAI_API_KEY: 'opaque-test-provider-key', AI_SESSION_SECRET: '0123456789abcdef'.repeat(4), TURNSTILE_SITE_KEY: 'production-widget', TURNSTILE_SECRET_KEY: 'production-secret', ALLOWED_ORIGINS: 'https://planner.test', AI_MONTHLY_COST_LIMIT_USD: '10' });
const siteHeaders = { 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com" };
function mockDeployment(state = 'ready', mutate = () => {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (new URL(url).pathname === '/') return new Response('page', { status: 200, headers: siteHeaders });
    const foreign = options.headers.Origin !== 'https://planner.test';
    const ping = JSON.parse(options.body).ping === true;
    const sessionEndpoint = url.endsWith('/ai-session');
    const response = {
      status: foreign ? 403 : state === 'unavailable' ? 503 : state === 'exhausted' ? 429 : ping ? 200 : sessionEndpoint ? 400 : 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin', ...(!foreign ? { 'Access-Control-Allow-Origin': 'https://planner.test', 'Access-Control-Allow-Credentials': 'true' } : {}) },
      data: foreign ? { error: 'forbidden' } : state === 'unavailable' ? { error: 'unavailable' } : state === 'exhausted' ? { error: 'quota', code: 'AI_COST_LIMIT' } : ping ? { ready: true, sessionReady: false, siteKey: 'public-widget-key' } : { error: 'verify', code: 'AI_SESSION_REQUIRED' },
    };
    mutate(response, url, options);
    return new Response(JSON.stringify(response.data), response);
  };
  return { fetcher, calls };
}

test('configuration validator flags disabled AI, weak secrets, bad origins, test widgets and exposed secrets without printing values', () => {
  assert.equal(checkAIConfig(env()).ok, true);
  assert.equal(checkAIConfig({ ...env(), AI_ENABLED: 'false' }).ok, false);
  assert.equal(checkAIConfig({ ...env(), AI_ENABLED: 'false' }, { allowDisabled: true }).ok, true);
  for (const mutation of [
    { AI_SESSION_SECRET: 'x'.repeat(64) }, { ALLOWED_ORIGINS: 'https://planner.test/path' },
    { ALLOWED_ORIGINS: 'https://*.test' }, { ALLOWED_ORIGINS: 'https://localhost' },
    { TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }, { AI_MONTHLY_COST_LIMIT_USD: '-1' },
    { VITE_OPENAI_API_KEY: 'DO-NOT-PRINT-THIS' }, { NETLIFY_DEV: 'true' },
    { CONTEXT: 'deploy-preview' }, { CONTEXT: 'branch-deploy' }, { OPENAI_API_KEY: ' provider-key ' },
  ]) {
    const settings = { ...env(), ...mutation };
    const result = checkAIConfig(settings);
    assert.equal(result.ok, false);
    const report = formatConfigReport(result);
    for (const key of ['OPENAI_API_KEY', 'AI_SESSION_SECRET', 'TURNSTILE_SECRET_KEY', 'VITE_OPENAI_API_KEY']) {
      if (settings[key]) assert.ok(!report.includes(settings[key]));
    }
  }
});

test('ready smoke check rejects unauthenticated generation without tokens or valid generation bodies', async () => {
  const { fetcher, calls } = mockDeployment();
  const result = await checkDeployment('https://planner.test', { fetcher });
  assert.equal(result.ok, true);
  assert.equal(result.aiState, 'read-ready');
  assert.ok(!formatDeploymentReport(result).includes('public-widget-key'));
  assert.equal(calls.length, 13);
  for (const { options } of calls) {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'manual');
    if (options.body) assert.ok(['{}', '{"ping":true}'].includes(options.body));
    assert.ok(!options.headers?.Cookie);
  }
});

test('unavailable cannot accidentally pass as ready and reports uncertainty about disabled state', async () => {
  const { fetcher } = mockDeployment('unavailable');
  const enabled = await checkDeployment('https://planner.test', { fetcher });
  assert.equal(enabled.ok, false);
  const disabled = await checkDeployment('https://planner.test', { fetcher, expectAI: 'disabled' });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.aiState, 'unavailable');
  assert.match(formatDeploymentReport(disabled), /does not distinguish disabled/);
});

test('smoke catches unsafe CORS, cached responses, missing access guard and legacy ping', async () => {
  for (const mutate of [
    response => { response.headers['Access-Control-Allow-Origin'] = '*'; },
    response => { response.headers['Cache-Control'] = 'public, max-age=600'; },
    (response, url, options) => { if (options.body === '{}' && !url.endsWith('/ai-session')) response.status = 200; },
    response => { if (response.data.ready) response.data = { ok: true }; },
  ]) {
    const { fetcher } = mockDeployment('ready', mutate);
    assert.equal((await checkDeployment('https://planner.test', { fetcher })).ok, false);
  }
});

test('smoke treats network failures and HTML catch-all as failures and rejects unsafe URL arguments', async () => {
  assert.equal((await checkDeployment('https://planner.test', { fetcher: async () => { throw new Error('private server body'); } })).ok, false);
  assert.equal((await checkDeployment('https://planner.test', { fetcher: async () => new Response('SPA catch-all', { status: 200 }) })).ok, false);
  for (const url of ['http://planner.test', 'https://planner.test/path', 'https://user:secret@planner.test', 'https://planner.test?secret=x']) {
    await assert.rejects(checkDeployment(url));
  }
});
