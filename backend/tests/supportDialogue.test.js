import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupportRequest, SUPPORT_JOB } from '../services/supportDialogue.js';
import handler from '../api/support.js';

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(v) { this.body = v; return this; }, end() { return this; } };
}

test('support job does not reopen scenes or let chat change the timer', () => {
  assert.match(SUPPORT_JOB, /Do not change the timer/);
  assert.match(SUPPORT_JOB, /Scenes do not reopen/);
  assert.match(SUPPORT_JOB, /no notifications, no diary, no savings/);
});

test('support chat stays after they said they smoked, and only flags a product record', async () => {
  const result = await handleSupportRequest({
    appStage: 'support',
    message: 'I smoked one in the car.',
    history: [{ role: 'assistant', content: 'What’s going on right now?' }],
    memory: [{ id: 'm-pause', source: 'player', status: 'current', summary: 'wants to keep the pause', quote: 'I want the minute' }],
  }, {
    createCompletion: async params => {
      assert.match(params.messages[0].content, /a smoke-free count is running/);
      assert.match(params.messages[0].content, /I want the minute/);
      return { choices: [{ message: { content: '{"reply":"What actually happened in the car? There is a way on screen to record it if you want.","stance":"probe","next":"stay","record_smoked":true,"memory_updates":[]}' } }] };
    },
  });
  assert.equal(result.next, 'stay');
  assert.equal(result.recordSmoked, true);
  assert.match(result.response, /record it/);
});

test('journey users cannot use the support API', async () => {
  await assert.rejects(
    handleSupportRequest({ appStage: 'journey', message: 'help', history: [] }, {
      createCompletion: async () => ({ choices: [{ message: { content: '{"reply":"Hi","stance":"hold"}' } }] }),
    }),
    e => e.status === 409 && e.issue === 'not_in_support',
  );
  const closed = response();
  await handler({ method: 'POST', body: { appStage: 'journey', message: 'help' } }, closed);
  assert.equal(closed.code, 409);
});
