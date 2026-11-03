import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayerCard, playerCardPrompt } from '../services/playerCard.js';

test('player card leaves unknown slots empty and keeps revised notes out of current slots', () => {
  const card = buildPlayerCard([
    {
      id: 'm-coffee',
      source: 'player',
      status: 'current',
      theme: 'weeks',
      sceneId: 'weeks',
      summary: 'morning coffee is the hardest cue',
      quote: 'Coffee is when I want it most',
    },
    {
      id: 'm-fear',
      source: 'player',
      status: 'current',
      theme: 'willpower',
      sceneId: 'willpower',
      summary: 'afraid of getting irritable with the kids',
      quote: 'I fear I will snap at the children',
    },
    {
      id: 'm-wrong',
      source: 'muse_hypothesis',
      status: 'revised',
      theme: 'stress',
      summary: 'invented that they sent an angry email',
    },
  ]);
  assert.equal(card.slots.available_support, 'unknown');
  assert.equal(card.slots.planned_actions, 'unknown');
  assert.ok(Array.isArray(card.slots.situations_and_triggers));
  assert.ok(card.slots.situations_and_triggers.some(item => item.id === 'm-coffee'));
  assert.ok(Array.isArray(card.slots.fears));
  assert.ok(card.slots.fears.some(item => item.id === 'm-fear'));
  assert.ok(card.not_current.some(item => item.id === 'm-wrong'));
  const prompt = playerCardPrompt(card);
  assert.match(prompt, /unknown/);
  assert.match(prompt, /not_current/);
  assert.doesNotMatch(prompt, /invent biography/);
});

test('authoritative support memory wins over a stale client body', async () => {
  const { handleSupportRequest } = await import('../services/supportDialogue.js');
  let prompt = '';
  await handleSupportRequest({
    message: 'I want a cigarette',
    history: [],
    memory: [{ id: 'm-stale', source: 'player', status: 'current', summary: 'stale local only' }],
  }, {
    resolvedAppStage: 'support',
    smokingStatus: 'abstaining',
    authoritativeMemory: [{
      id: 'm-server',
      source: 'player',
      status: 'current',
      theme: 'stress',
      sceneId: 'stress',
      summary: 'stress break at work',
      quote: 'I step away when the bug is stuck',
    }],
    createCompletion: async params => {
      prompt = params.messages[0].content;
      return { choices: [{ message: { content: '{"reply":"What is happening in this minute?","stance":"probe","next":"stay","memory_updates":[]}' } }] };
    },
  });
  assert.match(prompt, /Internal player card/);
  assert.match(prompt, /stress break at work/);
  assert.doesNotMatch(prompt, /stale local only/);
  assert.match(prompt, /a smoke-free count is running/);
});
