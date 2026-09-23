import { guardAIRequest, createSession, sessionCookie, getClientIp, limitSessionAttempts, jsonResponse, safeErrorResponse, logServerError } from './_shared/aiGuard.js';

export function challengeMatches(result, origin) {
  return result?.success === true && result.action === 'ai-access' && result.hostname === new URL(origin).hostname;
}

export async function verifyChallenge(token, event, fetcher = fetch) {
  const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: getClientIp(event) }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Verification service unavailable');
  const result = await response.json();
  const origin = Object.entries(event.headers).find(([key]) => key.toLowerCase() === 'origin')?.[1];
  return challengeMatches(result, origin);
}

export const handler = async (event) => {
  const blocked = await guardAIRequest(event, { sessionEndpoint: true });
  if (blocked) return blocked;
  const { body, cors } = event._aiGuard;
  if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) return jsonResponse(400, { error: 'Complete the access verification.' }, cors);
  try {
    if (!await limitSessionAttempts(event)) return jsonResponse(429, { error: 'Too many verification attempts. Please try again later.' }, { ...cors, 'Retry-After': '600' });
    if (!await verifyChallenge(body.token, event)) return jsonResponse(403, { error: 'Verification failed. Please try again.' }, cors);
    return jsonResponse(200, { ok: true }, { ...cors, 'Set-Cookie': sessionCookie(createSession(event)) });
  } catch (error) {
    logServerError('session', error);
    return safeErrorResponse(503, cors);
  }
};
