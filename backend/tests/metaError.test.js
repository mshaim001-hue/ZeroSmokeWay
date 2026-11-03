import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_MUSE_TIMEOUT_MS,
  META_CALL_TIMEOUT_MS,
  META_HANDLER_BUDGET_MS,
  META_TRANSIENT_DELAY_MS,
  VERCEL_META_MAX_DURATION_S,
  callMetaWithTransientRetry,
  cleanMetaMessage,
  createMetaBudget,
  isTransientMetaError,
  logMetaFailure,
  metaErrorFields,
  resolveMetaModel,
} from '../services/metaError.js';
import { handleSceneRequest } from '../services/sceneDialogue.js';
import { handleSupportRequest } from '../services/supportDialogue.js';
import { config as sceneConfig } from '../api/scene.js';
import { config as supportConfig } from '../api/support.js';

const okCompletion = {
  choices: [{ message: { content: '{"reply":"Hi","stance":"hold","next":"stay","memory_updates":[]}' }, finish_reason: 'stop' }],
};

test('META_MODEL is trimmed before it is sent', () => {
  assert.equal(resolveMetaModel({ META_MODEL: '  muse-spark-1.3  ' }, 'fallback'), 'muse-spark-1.3');
  assert.equal(resolveMetaModel({ META_MODEL: '   ' }, 'muse-spark-1.3'), 'muse-spark-1.3');
});

test('timeout layers stay ordered: call < budget < client < vercel', () => {
  assert.equal(META_CALL_TIMEOUT_MS, 45_000);
  assert.equal(META_HANDLER_BUDGET_MS, 100_000);
  assert.equal(CLIENT_MUSE_TIMEOUT_MS, 110_000);
  assert.equal(VERCEL_META_MAX_DURATION_S, 120);
  assert.ok(META_CALL_TIMEOUT_MS < META_HANDLER_BUDGET_MS);
  assert.ok(META_HANDLER_BUDGET_MS < CLIENT_MUSE_TIMEOUT_MS);
  assert.ok(CLIENT_MUSE_TIMEOUT_MS < VERCEL_META_MAX_DURATION_S * 1000);
  assert.equal(sceneConfig.maxDuration, VERCEL_META_MAX_DURATION_S);
  assert.equal(supportConfig.maxDuration, VERCEL_META_MAX_DURATION_S);
});

test('Meta error logs keep status, code, type, request id, and a cleaned message', () => {
  const fields = metaErrorFields({
    status: 404,
    code: 'model_not_found',
    type: 'invalid_request_error',
    message: 'The model `muse-spark-1.3` does not exist. Bearer sk-secret Authorization: Bearer abc',
    headers: { 'x-request-id': 'req_123' },
  });
  assert.equal(fields.status, 404);
  assert.equal(fields.code, 'model_not_found');
  assert.equal(fields.type, 'invalid_request_error');
  assert.equal(fields.requestId, 'req_123');
  assert.match(fields.message, /does not exist/);
  assert.doesNotMatch(fields.message, /sk-secret|Bearer abc/);
  assert.equal(JSON.stringify(fields).includes('sk-'), false);
});

test('every Meta failure is logged with a cleaned cause, including provider_error', () => {
  const lines = [];
  const warn = console.warn;
  console.warn = (...args) => { lines.push(args.map(String).join(' ')); };
  try {
    assert.equal(logMetaFailure('scene', {
      status: 500,
      code: 'internal',
      type: 'server_error',
      message: 'upstream failed Bearer sk-live-secret',
      headers: { 'x-request-id': 'req_provider' },
    }), 'provider_error');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /"source":"scene"/);
    assert.match(lines[0], /"issue":"provider_error"/);
    assert.match(lines[0], /"status":500/);
    assert.match(lines[0], /req_provider/);
    assert.doesNotMatch(lines[0], /sk-live-secret/);
  } finally {
    console.warn = warn;
  }
});

test('a model_unavailable mapping logs and still returns the public issue', async () => {
  const lines = [];
  const warn = console.warn;
  console.warn = (...args) => { lines.push(args.map(String).join(' ')); };
  try {
    const meta = {
      status: 404,
      code: 'model_not_found',
      type: 'invalid_request_error',
      message: 'model missing Bearer sk-live-secret',
      headers: { 'x-request-id': 'req_scene' },
    };
    assert.equal(logMetaFailure('scene', meta), 'model_unavailable');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /"source":"scene"/);
    assert.match(lines[0], /"status":404/);
    assert.match(lines[0], /req_scene/);
    assert.doesNotMatch(lines[0], /sk-live-secret/);
    await assert.rejects(
      handleSceneRequest({ sceneId: 'pitcher', message: 'hello', history: [] }, {
        createCompletion: async () => { throw meta; },
        sleep: async () => {},
      }),
      e => e.status === 503 && e.issue === 'model_unavailable' && e.message === 'model_unavailable',
    );
    await assert.rejects(
      handleSupportRequest({ message: 'hello', history: [] }, {
        resolvedAppStage: 'support',
        createCompletion: async () => { throw { ...meta, headers: { 'x-request-id': 'req_support' } }; },
        sleep: async () => {},
      }),
      e => e.status === 503 && e.issue === 'model_unavailable',
    );
  } finally {
    console.warn = warn;
  }
});

test('cleaned messages never keep keys or Authorization values', () => {
  assert.equal(cleanMetaMessage('Bearer abc sk-xyz api_key=secret'), '[redacted] [redacted] [redacted]');
});

test('only network and 502/503/504 are transient; auth and bad requests are not', () => {
  assert.equal(isTransientMetaError({ status: 502 }), true);
  assert.equal(isTransientMetaError({ status: 503 }), true);
  assert.equal(isTransientMetaError({ status: 504 }), true);
  assert.equal(isTransientMetaError({ name: 'APIConnectionTimeoutError' }), true);
  assert.equal(isTransientMetaError({ name: 'APIConnectionError' }), true);
  assert.equal(isTransientMetaError({ code: 'ECONNRESET' }), true);
  assert.equal(isTransientMetaError({ status: 401 }), false);
  assert.equal(isTransientMetaError({ status: 403 }), false);
  assert.equal(isTransientMetaError({ status: 400 }), false);
  assert.equal(isTransientMetaError({ status: 404 }), false);
  assert.equal(isTransientMetaError({ status: 429 }), false);
});

test('transient Meta errors retry once inside the budget, without multiplying attempts', async () => {
  const attempts = [];
  const sleeps = [];
  const result = await callMetaWithTransientRetry({
    source: 'scene',
    budget: createMetaBudget(() => 0, META_HANDLER_BUDGET_MS),
    sleep: async (ms) => { sleeps.push(ms); },
    createCompletion: async (params, options) => {
      attempts.push({ params, options });
      if (attempts.length === 1) {
        const error = new Error('bad gateway');
        error.status = 502;
        throw error;
      }
      return okCompletion;
    },
  });
  assert.equal(result, okCompletion);
  assert.equal(attempts.length, 2);
  assert.equal(sleeps.length, 1);
  assert.equal(sleeps[0], META_TRANSIENT_DELAY_MS);
  assert.equal(attempts[0].options.timeout, META_CALL_TIMEOUT_MS);
  assert.equal(attempts[1].options.timeout, META_CALL_TIMEOUT_MS);
});

test('auth and invalid_request Meta errors are not retried', async () => {
  for (const status of [401, 400]) {
    let calls = 0;
    await assert.rejects(
      callMetaWithTransientRetry({
        source: 'support',
        budget: createMetaBudget(() => 0, META_HANDLER_BUDGET_MS),
        sleep: async () => { throw new Error('should not sleep'); },
        createCompletion: async () => {
          calls += 1;
          const error = new Error('no');
          error.status = status;
          throw error;
        },
      }),
      e => e.issue === (status === 401 ? 'auth_error' : 'invalid_request'),
    );
    assert.equal(calls, 1);
  }
});

test('a spent budget skips the transient retry and the JSON retry', async () => {
  let now = 0;
  let calls = 0;
  await assert.rejects(
    handleSceneRequest({ sceneId: 'pitcher', message: 'hello', history: [] }, {
      now: () => now,
      sleep: async () => {},
      createCompletion: async () => {
        calls += 1;
        now = META_HANDLER_BUDGET_MS - 500;
        const error = new Error('gateway');
        error.status = 503;
        throw error;
      },
    }),
    e => e.issue === 'provider_error',
  );
  assert.equal(calls, 1);

  now = 0;
  calls = 0;
  await assert.rejects(
    handleSceneRequest({ sceneId: 'pitcher', message: 'hello', history: [] }, {
      now: () => now,
      sleep: async () => {},
      createCompletion: async () => {
        calls += 1;
        now = META_HANDLER_BUDGET_MS - 500;
        return { choices: [{ message: { content: 'not-json' }, finish_reason: 'stop' }] };
      },
    }),
    e => e.issue === 'invalid_response',
  );
  assert.equal(calls, 1);
});

test('scene recovers from one 503 then answers inside the shared budget', async () => {
  let calls = 0;
  const reply = await handleSceneRequest({ sceneId: 'pitcher', message: 'hello', history: [] }, {
    sleep: async () => {},
    createCompletion: async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error('unavailable');
        error.status = 503;
        throw error;
      }
      return okCompletion;
    },
  });
  assert.equal(reply.response, 'Hi');
  assert.equal(calls, 2);
});
