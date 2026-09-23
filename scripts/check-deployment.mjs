import { pathToFileURL } from 'node:url';

const endpoints = ['generate-ai-suggestions', 'chat-assistant', 'generate-ooo-message', 'ai-session'];
const unavailable = response => response.status === 503 && typeof response.data?.error === 'string';
const exhausted = response => response.status === 429 && response.data?.code === 'AI_COST_LIMIT';
const ready = response => response.status === 200 && response.data?.ready === true && response.data?.sessionReady === false && typeof response.data?.siteKey === 'string' && response.data.siteKey.length > 0;

export async function checkDeployment(origin, { expectAI = 'ready', fetcher = fetch } = {}) {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'https:') throw new Error('Provide an exact HTTPS deployment origin.');
  if (!['ready', 'disabled', 'either'].includes(expectAI)) throw new Error('Invalid expected AI state.');
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, status: pass ? 'pass' : 'fail', detail });
  const request = async (path, requestOrigin, body) => {
    try {
      const response = await fetcher(`${origin}${path}`, {
        ...(body ? { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
        credentials: 'omit', redirect: 'manual', signal: AbortSignal.timeout(15_000),
      });
      let data = null;
      if (response.headers.get('content-type')?.includes('application/json')) {
        try { data = await response.json(); } catch { /* Do not echo server content. */ }
      }
      return { status: response.status, headers: response.headers, data };
    } catch { return { status: 0, headers: new Headers(), data: null }; }
  };
  const page = await request('/', null, null);
  add('page', page.status === 200, 'Production page must respond without a redirect or authentication interstitial.');
  for (const [name, expected] of [['x-frame-options', 'DENY'], ['x-content-type-options', 'nosniff'], ['referrer-policy', 'strict-origin-when-cross-origin']]) {
    add(`page:${name}`, page.headers.get(name)?.toLowerCase() === expected.toLowerCase(), 'Expected security header must be present.');
  }
  add('page:HSTS', /max-age=([1-9]\d{6,})/.test(page.headers.get('strict-transport-security') || ''), 'A production HTTPS HSTS policy must be present.');
  const csp = page.headers.get('content-security-policy') || '';
  const directives = new Map(csp.split(';').map(part => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
  add('page:CSP', directives.get('default-src')?.includes("'self'") && directives.get('frame-ancestors')?.includes("'none'") && directives.get('object-src')?.includes("'none'") && ['script-src', 'frame-src', 'connect-src'].every(name => directives.get(name)?.includes('https://challenges.cloudflare.com')) && !directives.get('script-src')?.some(value => ["'unsafe-eval'", "'unsafe-inline'", '*'].includes(value)), 'CSP must restrict scripts/framing and permit the verification widget.');
  const states = [];
  for (const name of endpoints) {
    const path = `/.netlify/functions/${name}`;
    // Empty input never forms a valid paid request. No session, prompt, or challenge token is supplied.
    const ping = await request(path, origin, { ping: true });
    const state = ready(ping) ? 'read-ready' : unavailable(ping) ? 'unavailable' : exhausted(ping) ? 'budget-exhausted' : 'unexpected';
    states.push(state);
    add(`${name}:readiness`, expectAI === 'ready' ? state === 'read-ready' : expectAI === 'disabled' ? state === 'unavailable' : state !== 'unexpected', `Observed ${state}; unavailable does not distinguish disabled, incomplete configuration, or failed storage.`);
    add(`${name}:no-store`, ping.headers.get('cache-control')?.split(',').some(value => value.trim().toLowerCase() === 'no-store'), 'Function responses must not be cached.');
    add(`${name}:CORS`, ping.headers.get('access-control-allow-origin') === origin && ping.headers.get('access-control-allow-credentials') === 'true' && (ping.headers.get('vary') || '').toLowerCase().split(',').map(value => value.trim()).includes('origin'), 'Credentialed CORS must allow only the exact requested origin.');
    add(`${name}:no-session-on-ping`, !ping.headers.has('set-cookie'), 'Readiness must not issue an access session.');
    const forbidden = await request(path, 'https://untrusted.invalid', { ping: true });
    add(`${name}:foreign-origin`, forbidden.status === 403 && !forbidden.headers.has('access-control-allow-origin'), 'An unapproved Origin must be rejected before readiness.');
    if (state === 'read-ready') {
      const unauth = await request(path, origin, {});
      add(`${name}:unauthenticated`, name === 'ai-session' ? unauth.status === 400 && !unauth.headers.has('set-cookie') : unauth.status === 401 && unauth.data?.code === 'AI_SESSION_REQUIRED', name === 'ai-session' ? 'Missing challenge must not issue a session.' : 'Missing session must be rejected before generation.');
    }
  }
  add('consistent-readiness', new Set(states).size === 1, 'All AI functions must report the same deployment state.');
  return { ok: checks.every(check => check.status === 'pass'), aiState: new Set(states).size === 1 ? states[0] : 'inconsistent', checks };
}

export function formatDeploymentReport(result) {
  return [...result.checks.map(check => `${check.status.toUpperCase()} ${check.name}: ${check.detail}`),
    result.ok ? 'Nonpaid deployment smoke checks passed.' : 'Deployment smoke checks failed.',
    'Not proven: Blobs conditional writes, trusted IP overwrite, successful challenge/cookie issuance, provider credentials, or paid generation. No paid call was requested.'].join('\n');
}

if (process.argv[1]?.endsWith('/check-deployment.mjs') && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [origin, option, ...extra] = process.argv.slice(2);
  if (!origin || extra.length || (option && !/^--expect-ai=(ready|disabled|either)$/.test(option))) {
    console.error('Usage: node scripts/check-deployment.mjs https://your-production-origin [--expect-ai=ready|disabled|either]');
    process.exitCode = 2;
  } else {
    try {
      const result = await checkDeployment(origin, { expectAI: option?.split('=')[1] || 'ready' });
      console.log(formatDeploymentReport(result));
      process.exitCode = result.ok ? 0 : 1;
    } catch {
      console.error('Deployment check could not start: provide an exact HTTPS deployment origin.');
      process.exitCode = 2;
    }
  }
}
