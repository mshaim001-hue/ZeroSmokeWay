import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLifecycle,
  currentOpenInterval,
  defaultProgress,
  isLifecycleSnapshot,
  mergeEnvelopes,
  mergeSupportSnapshot,
  newerEnvelope,
  parseChat,
  parseMemory,
  parseProgress,
  persistPhase,
  refuseSceneDowngrade,
} from '../src/auth/progressModel.ts';

test('new users have not seen the intro and start on scene 1', () => {
  const start = defaultProgress();
  assert.equal(start.seenIntro, false);
  assert.equal(start.sceneId, 'pitcher');
  assert.equal(start.phase, 'idle');
  assert.deepEqual(start.chat, []);
  assert.equal(start.canAdvance, false);
  assert.equal(start.offerOpen, false);
  assert.deepEqual(start.memory, []);
  assert.equal(start.appStage, 'journey');
  assert.deepEqual(start.supportChat, []);
  assert.deepEqual(start.intervals, []);
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
    offer_open: true,
    chat: [
      { id: 'a1', role: 'assistant', content: 'What did that remind you of?' },
      { id: 'u1', role: 'user', content: 'It calms me.' },
    ],
  });
  assert.equal(saved.sceneId, 'stress');
  assert.equal(saved.phase, 'chat');
  assert.equal(saved.seenIntro, true);
  assert.equal(saved.canAdvance, true);
  assert.equal(saved.offerOpen, true);
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

test('saved model JSON is shown as the reply or hidden if it never closed', () => {
  const saved = parseProgress({
    sceneId: 'pitcher',
    phase: 'chat',
    seenIntro: true,
    chat: [
      { id: 'a1', role: 'assistant', content: '{"reply":"When did that stop feeling true?","stance":"probe","next":"stay"}' },
      { id: 'u1', role: 'user', content: 'After coffee.' },
      { id: 'a2', role: 'assistant', content: '{"reply":"Look.","memory":[{"id":"m1"' },
    ],
  });
  assert.equal(saved.chat.length, 2);
  assert.equal(saved.chat[0].content, 'When did that stop feeling true?');
  assert.equal(saved.chat[1].content, 'After coffee.');
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

test('a confirmed last cigarette is support, and the client cannot reopen a scene', () => {
  const saved = parseProgress({
    scene_id: 'truth',
    app_stage: 'support',
    smoking_status: 'abstaining',
    seen_intro: true,
    intervals: [{ id: 'i1', started_at: '2026-11-02T06:00:00.000Z', source: 'now' }],
  });
  assert.equal(saved.appStage, 'support');
  assert.equal(currentOpenInterval(saved)?.startedAt, '2026-11-02T06:00:00.000Z');
  const frozen = refuseSceneDowngrade(saved, { ...defaultProgress(), sceneId: 'pitcher' });
  assert.equal(frozen.appStage, 'support');
  assert.equal(frozen.sceneId, 'truth');
});

test('a newer journey cache cannot beat remote support, and a delayed chat save cannot restore a timer', () => {
  const remote = {
    userId: 'u',
    updatedAt: 10,
    progress: parseProgress({
      scene_id: 'truth',
      app_stage: 'support',
      smoking_status: 'smoking',
      seen_intro: true,
      intervals: [{ id: 'old', started_at: '2026-11-01T00:00:00.000Z', ended_at: '2026-11-02T10:00:00.000Z', source: 'now' }],
    }),
  };
  const local = {
    userId: 'u',
    updatedAt: 99,
    progress: { ...defaultProgress(), seenIntro: true, sceneId: 'pitcher' },
  };
  const merged = mergeEnvelopes(local, remote);
  assert.equal(merged?.progress.appStage, 'support');
  assert.equal(merged?.progress.sceneId, 'truth');
  assert.equal(merged?.progress.smokingStatus, 'smoking');

  const chatting = { ...remote.progress, supportChat: [{ id: 'a', role: 'assistant', content: 'still going' }] };
  const afterRecord = applyLifecycle(chatting, remote.progress);
  assert.equal(afterRecord.supportChat[0].content, 'still going');
  assert.equal(afterRecord.smokingStatus, 'smoking');
  assert.equal(afterRecord.appStage, 'support');
  assert.equal(isLifecycleSnapshot({ ok: true }), false);
  assert.equal(isLifecycleSnapshot({ app_stage: 'support', intervals: [] }), true);

  const incomplete = {
    userId: 'u',
    updatedAt: 200,
    schemaComplete: false,
    progress: defaultProgress(),
  };
  const fromLegacy = mergeEnvelopes({ ...remote, updatedAt: 1, schemaComplete: true }, incomplete);
  assert.equal(fromLegacy?.progress.appStage, 'support');
  assert.equal(fromLegacy?.progress.smokingStatus, 'smoking');
});

test('support memory stays after reload even when those turns have left the chat window', () => {
  const saved = parseProgress({
    scene_id: 'truth',
    app_stage: 'support',
    smoking_status: 'abstaining',
    seen_intro: true,
    support_chat: [{ id: 'later', role: 'assistant', content: 'What is this minute like?' }],
    memory: [{
      id: 'm-stay',
      source: 'player',
      status: 'revised',
      summary: 'stayed and listened; thought about leaving',
      quote: 'I stayed',
    }],
    intervals: [{ id: 'i1', started_at: '2026-11-02T06:00:00.000Z', source: 'now' }],
  });
  assert.equal(saved.memory[0].quote, 'I stayed');
  assert.equal(saved.memory[0].status, 'revised');
  assert.equal(saved.supportChat.length, 1);
  assert.doesNotMatch(saved.supportChat[0].content, /I stayed/);
});

test('a mounted support view takes remote lifecycle and keeps in-flight chat', () => {
  const local = parseProgress({
    scene_id: 'truth',
    app_stage: 'support',
    smoking_status: 'abstaining',
    support_chat: [{ id: 'a', role: 'user', content: 'wait' }],
    memory: [{ id: 'm1', source: 'player', status: 'current', summary: 'wants the minute', quote: 'I want the minute' }],
    intervals: [{ id: 'i1', started_at: '2026-11-02T06:00:00.000Z', source: 'now' }],
  });
  const remote = parseProgress({
    scene_id: 'truth',
    app_stage: 'support',
    smoking_status: 'smoking',
    support_chat: [],
    memory: [],
    intervals: [{ id: 'i1', started_at: '2026-11-02T06:00:00.000Z', ended_at: '2026-11-02T08:00:00.000Z', source: 'now' }],
  });
  const busy = mergeSupportSnapshot(local, remote, { preserveChat: true });
  assert.equal(busy.smokingStatus, 'smoking');
  assert.equal(busy.supportChat[0].content, 'wait');
  assert.equal(busy.memory[0].quote, 'I want the minute');
  assert.equal(currentOpenInterval(busy), null);
  const idle = mergeSupportSnapshot(local, remote, { preserveChat: false });
  assert.equal(idle.smokingStatus, 'smoking');
  assert.equal(idle.supportChat[0].content, 'wait');
});

test('not yet is intention only: no live interval', () => {
  const saved = parseProgress({
    scene_id: 'truth',
    phase: 'chat',
    seen_intro: true,
    app_stage: 'preparing_to_start',
    completion_offered: true,
    intended_at: '2026-11-02T11:00:00.000Z',
    chat: [{ role: 'assistant', content: 'Still smoking is a complete place to stand.' }],
  });
  assert.equal(saved.appStage, 'preparing_to_start');
  assert.equal(currentOpenInterval(saved), null);
});
