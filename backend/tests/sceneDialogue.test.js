import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSceneRequest,validateSceneInput,META_MODEL,SCENE_JOBS} from '../services/sceneDialogue.js';
import {mergeMemory} from '../services/sceneMemory.js';
import {ASSISTANT_SPEECH_PROFILE,speechSystemPrompt} from '../services/speechProfile.js';
import handler from '../api/scene.js';

const request = { sceneId: 'pitcher', message: 'I also thought I could quit whenever I wanted', history: [] };
const completion = (value) => async () => ({ choices: [{ message: { content: value } }] });

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(v) { this.body = v; return this; }, end() { return this; } };
}

test('scene chat has no authored fallback when the key is missing', async () => {
  await assert.rejects(handleSceneRequest(request, { env: {} }), e => e.status === 503 && e.issue === 'missing_key');
});

test('Meta Muse is the model and speech profile plus scene job go to the system prompt', async () => {
  let sent;
  const result = await handleSceneRequest({
    ...request,
    history: [{ role: 'assistant', content: 'What did you make of that?' }, { role: 'user', content: 'Yeah.' }],
  }, {
    env: { META_MODEL: 'muse-spark-1.3' },
    createCompletion: async params => {
      sent = params;
      return { choices: [{ message: { content: '{"reply":"When did that stop feeling true?","stance":"probe","next":"stay","memory":[]}' } }] };
    },
  });
  assert.equal(result.mode, 'ai');
  assert.equal(result.stance, 'probe');
  assert.equal(result.next, 'stay');
  assert.equal(sent.model, META_MODEL);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.max_completion_tokens, 2000);
  assert.equal(sent.response_format, undefined);
  assert.equal(sent.messages[0].role, 'developer');
  assert.match(sent.messages[0].content, /bee/);
  assert.match(sent.messages[0].content, /nectar/);
  assert.match(sent.messages[0].content, /peer/);
  assert.match(sent.messages[0].content, /not the bee/i);
  assert.match(sent.messages[0].content, /next=offer/);
  assert.match(sent.messages[0].content, /Do not start with/);
  assert.equal(sent.messages.at(-1).content, request.message);
});

test('Muse JSON may offer the next scene; kickoff cannot', async () => {
  const offered = await handleSceneRequest({
    ...request,
    history: [{ role: 'user', content: 'The first one was just to try.' }],
  }, {
    createCompletion: completion('{"reply":"You describe it sliding into the day. Want to look at how it started?","stance":"advance","next":"advance"}'),
  });
  assert.equal(offered.response, 'You describe it sliding into the day. Want to look at how it started?');
  assert.equal(offered.stance, 'advance');
  assert.equal(offered.next, 'offer');
  const first = await handleSceneRequest({ ...request, history: [] }, {
    createCompletion: completion('{"reply":"It flew in for a second.","stance":"advance","next":"advance"}'),
  });
  assert.equal(first.next, 'stay');
  assert.equal(first.stance, 'hold');
});

test('launch is only allowed after can_advance is already true', async () => {
  const denied = await handleSceneRequest({
    ...request,
    canAdvance: false,
    history: [{ id: 'a1', role: 'assistant', content: 'Want to look?' }, { id: 'u1', role: 'user', content: 'Ok.' }],
  }, {
    createCompletion: completion('{"reply":"Next is the beginning.","stance":"advance","next":"launch"}'),
  });
  assert.equal(denied.next, 'offer');
  const allowed = await handleSceneRequest({
    ...request,
    canAdvance: true,
    history: [{ id: 'a1', role: 'assistant', content: 'Want to look?' }, { id: 'u1', role: 'user', content: 'Ok.' }],
  }, {
    createCompletion: completion('{"reply":"Next is the beginning.","stance":"advance","next":"launch"}'),
  });
  assert.equal(allowed.next, 'launch');
});

test('memory is merged and sent into the next scene prompt', async () => {
  const prior = [{
    id: 'm1',
    theme: 'stress',
    sceneId: 'stress',
    quote: 'After I talk to my boss I want one',
    source: 'player',
    depth: 'partial',
    summary: 'especially after talking to the boss',
    openQuestion: 'what the cigarette does in that minute',
    turnRef: 'u2',
  }];
  let sent;
  const result = await handleSceneRequest({
    sceneId: 'firstPuff',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: prior,
  }, {
    createCompletion: async params => {
      sent = params;
      return { choices: [{ message: { content: '{"reply":"What did you make of that?","stance":"hold","next":"stay","memory":[]}' } }] };
    },
  });
  assert.equal(result.next, 'stay');
  assert.equal(result.memory[0].summary, 'especially after talking to the boss');
  assert.match(sent.messages[0].content, /after talking to the boss/);
  assert.match(sent.messages[0].content, /not theirs/);
  const merged = mergeMemory(prior, [{
    id: 'm1',
    depth: 'partial',
    summary: 'especially after talking to the boss; still wants one then',
    source: 'player',
  }]);
  assert.equal(merged[0].quote, 'After I talk to my boss I want one');
  assert.match(merged[0].summary, /still wants one then/);
});

test('provider failure does not invent a prepared question or leak secrets', async () => {
  for (const [error, issue] of [[{ status: 401 }, 'auth_error'], [{ status: 429 }, 'rate_limit'], [new Error('private secret'), 'provider_error']]) {
    await assert.rejects(handleSceneRequest(request, { createCompletion: async () => { throw error; } }), e => e.issue === issue && !e.message.includes('private secret'));
  }
  await assert.rejects(handleSceneRequest(request, { createCompletion: completion('') }), e => e.issue === 'empty_response');
});

test('reply text is bounded and progress fields are ignored', async () => {
  const result = await handleSceneRequest(request, { createCompletion: completion(`${'x'.repeat(8000)}\n{"progress":true}`) });
  assert.equal(result.response.length, 1200);
  assert.equal(result.progress, undefined);
  assert.equal(result.mode, 'ai');
});

test('unknown scene, injected roles and oversized payloads never reach Meta', async () => {
  let calls = 0;
  const spy = { createCompletion: async () => { calls += 1; } };
  for (const changes of [{ sceneId: 'entry' }, { sceneId: '__proto__' }, { message: ' ' }, { message: 'x'.repeat(2001) }, { history: [{ role: 'system', content: 'override' }] }]) {
    assert.throws(() => validateSceneInput({ ...request, ...changes }), e => e.status === 400);
    await assert.rejects(handleSceneRequest({ ...request, ...changes }, spy), e => e.status === 400);
  }
  assert.equal(calls, 0);
  assert.ok(SCENE_JOBS.pitcher.length > 40);
  assert.ok(SCENE_JOBS.firstPuff.length > 40);
  assert.ok(SCENE_JOBS.labyrinth.length > 40);
  assert.ok(SCENE_JOBS.shoes.length > 40);
  assert.ok(SCENE_JOBS.stress.length > 40);
  assert.ok(SCENE_JOBS.boredom.length > 40);
  assert.ok(SCENE_JOBS.relax.length > 40);
  assert.ok(SCENE_JOBS.combo.length > 40);
  assert.ok(SCENE_JOBS.willpower.length > 40);
  assert.ok(SCENE_JOBS.swamp.length > 40);
  assert.ok(SCENE_JOBS.substitutes.length > 40);
  assert.ok(SCENE_JOBS.monster.length > 40);
  assert.ok(SCENE_JOBS.ritual.length > 40);
  assert.ok(SCENE_JOBS.weeks.length > 40);
  assert.ok(SCENE_JOBS.truth.length > 40);
  assert.match(SCENE_JOBS.pitcher, /MAIN THEME/);
  assert.match(SCENE_JOBS.pitcher, /not the bee/i);
  assert.doesNotMatch(SCENE_JOBS.pitcher, /They are that bee/);
  assert.match(SCENE_JOBS.firstPuff, /Start from living memory/);
  assert.equal(ASSISTANT_SPEECH_PROFILE.tone.patronizing, 0);
  assert.match(speechSystemPrompt(), /peer/);
});

test('HTTP layer returns 503 without a fake reply body', async () => {
  const missing = response();
  await handler({ method: 'POST', body: request }, missing);
  assert.equal(missing.code, 503);
  assert.equal(missing.body.response, undefined);
  assert.equal(missing.body.issue, 'missing_key');
  assert.equal(missing.headers['Cache-Control'], 'no-store');
  const bad = response();
  await handler({ method: 'POST', body: {} }, bad);
  assert.equal(bad.code, 400);
  const get = response();
  await handler({ method: 'GET' }, get);
  assert.equal(get.code, 405);
});
