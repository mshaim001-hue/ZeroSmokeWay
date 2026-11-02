import test from 'node:test';
import assert from 'node:assert/strict';
import { gateDialogueRequest, readAuthoritativeStage } from '../services/playerStage.js';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' };

test('scene and support gates use the server row, not the request body', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) };
    return { ok: true, json: async () => [{ app_stage: 'support', smoking_status: 'abstaining' }] };
  };
  const req = { headers: { authorization: 'Bearer token' } };
  await assert.rejects(gateDialogueRequest('scene', req, env, fetchImpl), e => e.status === 409 && e.issue === 'scenes_closed');
  const support = await gateDialogueRequest('support', req, env, fetchImpl);
  assert.equal(support.appStage, 'support');
  assert.equal(support.smokingStatus, 'abstaining');
});

test('a missing session is 401 when supabase is configured', async () => {
  await assert.rejects(
    readAuthoritativeStage({ headers: {} }, env, async () => ({ ok: false })),
    e => e.status === 401 && e.issue === 'auth_required',
  );
});

test('unknown lookups never fall open, and 409 is only for a known stage', async () => {
  const req = { headers: { authorization: 'Bearer token' }, body: { appStage: 'support' } };
  await assert.rejects(
    gateDialogueRequest('scene', req, {}, fetch),
    e => e.status === 503 && e.issue === 'not_configured',
  );
  await assert.rejects(
    gateDialogueRequest('support', req, {}, fetch),
    e => e.status === 503 && e.issue === 'not_configured',
  );
  const failed = async url => {
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) };
    return { ok: false, status: 400, json: async () => ({}) };
  };
  await assert.rejects(gateDialogueRequest('scene', req, env, failed), e => e.status === 503 && e.issue === 'stage_unavailable');
  await assert.rejects(gateDialogueRequest('support', req, env, failed), e => e.status === 503 && e.issue === 'stage_unavailable');
});

test('a successful empty progress row is journey: scenes open, support is 409', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1' }) };
    return { ok: true, json: async () => [] };
  };
  const req = { headers: { authorization: 'Bearer token' } };
  const scene = await gateDialogueRequest('scene', req, env, fetchImpl);
  assert.equal(scene.appStage, 'journey');
  assert.equal(scene.schemaComplete, true);
  await assert.rejects(
    gateDialogueRequest('support', req, env, fetchImpl),
    e => e.status === 409 && e.issue === 'not_in_support',
  );
});
