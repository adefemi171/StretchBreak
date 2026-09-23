import { pathToFileURL } from 'node:url';
import { isConfiguredValue, isSigningSecret, isTurnstileKey, isProductionOrigin } from '../netlify/functions/_shared/aiConfig.js';

// Never include values, exception messages, or the complete environment in this report.
export function checkAIConfig(env, { allowDisabled = false } = {}) {
  const checks = [];
  const add = (name, valid, detail) => checks.push({ name, status: valid ? 'pass' : 'fail', detail });
  add('AI_ENABLED', env.AI_ENABLED === 'true' || (allowDisabled && env.AI_ENABLED === 'false'), allowDisabled ? 'Must be true or explicitly false for pre-enable validation.' : 'Must be explicitly true for enabled readiness.');
  add('OPENAI_API_KEY', isConfiguredValue(env.OPENAI_API_KEY), 'A dedicated server-side project key is required; validity is not tested.');
  add('AI_SESSION_SECRET', isSigningSecret(env.AI_SESSION_SECRET), 'Use at least 32 cryptographically random bytes encoded as hex or base64; entropy cannot be proven here.');
  for (const name of ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) {
    add(name, isTurnstileKey(env[name]), 'A production widget key is required; Cloudflare test keys are rejected.');
  }
  const origins = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
  add('ALLOWED_ORIGINS', origins.length > 0 && origins.every(isProductionOrigin), 'Every entry must be an exact production HTTPS origin, without paths or wildcards.');
  const limit = env.AI_MONTHLY_COST_LIMIT_USD;
  add('AI_MONTHLY_COST_LIMIT_USD', limit === undefined || limit === '' || (Number.isFinite(Number(limit)) && Number(limit) > 0), 'Must be positive; absent uses the server default.');
  add('NETLIFY_DEV', env.NETLIFY_DEV !== 'true', 'Must not enable local development behavior in production.');
  add('CONTEXT', !env.CONTEXT || env.CONTEXT === 'production', 'Explicit nonproduction contexts are rejected. Production-scoped credentials are required because Functions may omit CONTEXT.');
  const exposed = Object.keys(env).filter(name => name.startsWith('VITE_') && /(?:SECRET|TOKEN|PASSWORD|PRIVATE|OPENAI.*KEY)/i.test(name));
  for (const name of exposed) add(name, false, 'Potential secret would be embedded in the browser bundle; remove and rotate if deployed.');
  return { ok: checks.every(check => check.status === 'pass'), enabled: env.AI_ENABLED === 'true', checks };
}

export function formatConfigReport(result) {
  return [...result.checks.map(check => `${check.status.toUpperCase()} ${check.name}: ${check.detail}`),
    result.ok ? (result.enabled ? 'Configuration shape passed. Deployment verification is still required.' : 'Pre-enable configuration shape passed. AI remains disabled.') : 'Configuration incomplete or unsafe. AI must remain disabled.',
    'Not tested: account ownership, key validity, widget hostname restrictions, shared-store writes, or provider billing limits.'].join('\n');
}

if (process.argv[1]?.endsWith('/check-ai-config.mjs') && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flags = process.argv.slice(2);
  if (flags.some(flag => flag !== '--allow-disabled')) {
    console.error('Usage: node [--env-file=.env] scripts/check-ai-config.mjs [--allow-disabled]');
    process.exitCode = 2;
  } else {
    const result = checkAIConfig(process.env, { allowDisabled: flags.includes('--allow-disabled') });
    console.log(formatConfigReport(result));
    process.exitCode = result.ok ? 0 : 1;
  }
}
