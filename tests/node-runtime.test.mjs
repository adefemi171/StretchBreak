import test from 'node:test';
import assert from 'node:assert/strict';
import { guardAIRequest, isPatchedNodeRuntime } from '../netlify/functions/_shared/aiGuard.js';

test('AI accepts patched supported Node releases and rejects vulnerable, EOL and unknown runtimes', () => {
  for (const version of ['22.23.4', '22.23.5', '22.24.0', '24.22.1', '24.22.2', '24.23.0', '26.12.1', '26.13.0']) {
    assert.equal(isPatchedNodeRuntime(version), true, version);
  }
  for (const version of ['22.23.3', '22.22.99', '24.21.0', '24.22.0', '26.12.0', '20.20.0', '23.0.0', '25.0.0', '27.0.0', '24.22.2-rc.1', '', 'unknown']) {
    assert.equal(isPatchedNodeRuntime(version), false, version);
  }
});

test('a vulnerable Lambda runtime fails before request data or network services are accessed', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process.versions, 'node');
  try {
    Object.defineProperty(process.versions, 'node', { ...descriptor, value: '24.21.0' });
    const event = {
      get headers() { throw new Error('must not inspect request headers'); },
      get body() { throw new Error('must not parse the request body'); },
    };
    const result = await guardAIRequest(event);
    assert.equal(result.statusCode, 503);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.deepEqual(JSON.parse(result.body), { error: 'AI is temporarily unavailable. Please try again later.' });
    assert.equal(event._aiGuard, undefined);
  } finally {
    Object.defineProperty(process.versions, 'node', descriptor);
  }
});
