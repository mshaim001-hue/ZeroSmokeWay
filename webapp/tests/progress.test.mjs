import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress,
  newerEnvelope,
  parseChat,
  parseMemory,
  parseProgress,
  persistPhase,
} from '../src/auth/progressModel.ts';

test('new users have not seen the intro and start on scene 1', () => {
  const start = defaultProgress();
  assert.equal(start.seenIntro, false);
  assert.equal(start.sceneId, 'pitcher');
  assert.equal(start.phase, 'idle');
  assert.deepEqual(start.chat, []);
  assert.equal(start.canAdvance, false);
  assert.deepEqual(start.memory, []);
});

test('a video in progress resumes as idle so the film plays again', () => {
  const saved = parseProgress({
    sceneId: 'ritual',
    phase: 'playing',
    chat: [{ role: 'assistant', content: 'old' }],
    seenIntro: true,
  });
  assert.equal(saved.sceneId, 'ritual');
  assert.equal(saved.phase, 'idle');
  assert.deepEqual(saved.chat, []);
  assert.equal(persistPhase('playing'), 'idle');
});

test('a chat in progress restores the previous dialogue with stable ids', () => {
  const saved = parseProgress({
    scene_id: 'stress',
    phase: 'chat',
    seen_intro: true,
    can_advance: true,
    chat: [
      { id: 'a1', role: 'assistant', content: 'What did that remind you of?' },
      { id: 'u1', role: 'user', content: 'It calms me.' },
    ],
  });
  assert.equal(saved.sceneId, 'stress');
  assert.equal(saved.phase, 'chat');
  assert.equal(saved.seenIntro, true);
  assert.equal(saved.canAdvance, true);
  assert.equal(saved.chat.length, 2);
  assert.equal(saved.chat[0].id, 'a1');
  assert.equal(saved.chat[1].id, 'u1');
  assert.equal(saved.chat[1].content, 'It calms me.');
});

test('legacy chat rows without ids get an id and unknown scenes do not crash resume', () => {
  const saved = parseProgress({
    sceneId: 'not-a-scene',
    phase: 'chat',
    chat: [{ role: 'system', content: 'nope' }, { role: 'user', content: '  ' }, { role: 'user', content: 'ok' }],
    seenIntro: true,
  });
  assert.equal(saved.sceneId, 'pitcher');
  const lines = parseChat(saved.chat);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].role, 'user');
  assert.equal(lines[0].content, 'ok');
  assert.ok(lines[0].id);
});

test('memory keeps player words, hypotheses, and depth', () => {
  const saved = parseProgress({
    sceneId: 'pitcher',
    phase: 'chat',
    seenIntro: true,
    memory: [
      {
        id: 'm1',
        theme: 'stress',
        sceneId: 'stress',
        quote: 'After I talk to my boss I want one',
        turnRef: 'u1',
        source: 'player',
        depth: 'partial',
        summary: 'especially after talking to the boss',
        openQuestion: 'what the cigarette does in that minute',
      },
    ],
  });
  assert.equal(saved.memory.length, 1);
  assert.equal(saved.memory[0].source, 'player');
  assert.equal(saved.memory[0].depth, 'partial');
  assert.equal(saved.memory[0].turnRef, 'u1');
  assert.equal(parseMemory([{ id: 'x', summary: 'kept' }])[0].summary, 'kept');
});

test('the newer device or cloud copy wins', () => {
  const older = { userId: 'u', updatedAt: 10, progress: defaultProgress() };
  const newer = { userId: 'u', updatedAt: 20, progress: { ...defaultProgress(), seenIntro: true } };
  assert.equal(newerEnvelope(older, newer)?.updatedAt, 20);
  assert.equal(newerEnvelope(newer, older)?.progress.seenIntro, true);
});
