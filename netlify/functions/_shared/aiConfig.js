// Keep the runtime gate and secret-safe deployment preflight on the same rules.
export const isPlaceholder = value => /(?:your[-_ ]|replace[-_ ]|changeme|example|placeholder)/i.test(value || '');
export const isConfiguredValue = value => typeof value === 'string' && value.trim().length > 0 && value === value.trim() && !isPlaceholder(value);
export const isSigningSecret = value => isConfiguredValue(value) && Buffer.byteLength(value) >= 32 && value.length >= 32 && new Set(value).size >= 12;
export const isTurnstileKey = (value, { allowTest = false } = {}) => isConfiguredValue(value) && (allowTest || !/^[123]x0+/.test(value));

// A preview must not inherit local cookies, IP fallbacks, or dummy widget keys.
// Netlify Dev uses the `dev` context by default; production simulation stays strict.
export const isLocalAIEnvironment = env => env.NETLIFY_DEV === 'true' && (!env.CONTEXT || env.CONTEXT === 'dev');
// CONTEXT is not guaranteed in Netlify Functions. Production-scoped credentials
// remain the deployment boundary when it is absent; explicit previews fail closed.
export const isProductionAIEnvironment = env => (!env.CONTEXT || env.CONTEXT === 'production') && env.NETLIFY_DEV !== 'true';

export function isProductionOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === value && url.protocol === 'https:' && !url.hostname.includes('*') && !isPlaceholder(url.hostname) &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.hostname.endsWith('.localhost');
  } catch { return false; }
}
