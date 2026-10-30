import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress,
  newerEnvelope,
  parseChat,
  parseProgress,
  persistPhase,
} from '../src/auth/progressModel.ts';

test('new users have not seen the intro and start on scene 1', () => {
  const start = defaultProgress();
  assert.equal(start.seenIntro, false);
  assert.equal(start.sceneId, 'pitcher');
  assert.equal(start.phase, 'idle');
  assert.deepEqual(start.chat, []);
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

test('a chat in progress restores the previous dialogue', () => {
  const saved = parseProgress({
    scene_id: 'stress',
    phase: 'chat',
    seen_intro: true,
    chat: [
      { role: 'assistant', content: 'What did that remind you of?' },
      { role: 'user', content: 'It calms me.' },
    ],
  });
  assert.equal(saved.sceneId, 'stress');
  assert.equal(saved.phase, 'chat');
  assert.equal(saved.seenIntro, true);
  assert.equal(saved.chat.length, 2);
  assert.equal(saved.chat[1].content, 'It calms me.');
});

test('broken chat rows and unknown scenes do not crash resume', () => {
  const saved = parseProgress({
    sceneId: 'not-a-scene',
    phase: 'chat',
    chat: [{ role: 'system', content: 'nope' }, { role: 'user', content: '  ' }, { role: 'user', content: 'ok' }],
    seenIntro: true,
  });
  assert.equal(saved.sceneId, 'pitcher');
  assert.deepEqual(parseChat(saved.chat), [{ role: 'user', content: 'ok' }]);
});

test('the newer device or cloud copy wins', () => {
  const older = { userId: 'u', updatedAt: 10, progress: defaultProgress() };
  const newer = { userId: 'u', updatedAt: 20, progress: { ...defaultProgress(), seenIntro: true } };
  assert.equal(newerEnvelope(older, newer)?.updatedAt, 20);
  assert.equal(newerEnvelope(newer, older)?.progress.seenIntro, true);
});
