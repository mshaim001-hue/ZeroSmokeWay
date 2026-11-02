import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMetaMessage, logMetaFailure, metaErrorFields, resolveMetaModel } from '../services/metaError.js';
import { handleSceneRequest } from '../services/sceneDialogue.js';
import { handleSupportRequest } from '../services/supportDialogue.js';

test('META_MODEL is trimmed before it is sent', () => {
  assert.equal(resolveMetaModel({ META_MODEL: '  muse-spark-1.3  ' }, 'fallback'), 'muse-spark-1.3');
  assert.equal(resolveMetaModel({ META_MODEL: '   ' }, 'muse-spark-1.3'), 'muse-spark-1.3');
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

test('a model_unavailable mapping logs once and still returns the public issue', async () => {
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
      }),
      e => e.status === 503 && e.issue === 'model_unavailable' && e.message === 'model_unavailable',
    );
    await assert.rejects(
      handleSupportRequest({ message: 'hello', history: [] }, {
        resolvedAppStage: 'support',
        createCompletion: async () => { throw { ...meta, headers: { 'x-request-id': 'req_support' } }; },
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
