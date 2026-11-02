import test from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmLastCigarette,
  declareIntent,
  defaultQuitState,
  formatSmokeFree,
  protectSceneWrite,
  recordSmoked,
} from '../services/quitState.js';

const now = new Date('2026-11-02T12:00:00.000Z');

test('watching the path does not start a count; not today keeps the scene', () => {
  const start = defaultQuitState();
  assert.equal(start.appStage, 'journey');
  assert.equal(start.intervals.length, 0);
  const intended = declareIntent(start, now);
  assert.equal(intended.state.appStage, 'preparing_to_start');
  assert.equal(intended.state.intervals.length, 0);
  assert.equal(intended.state.sceneId, start.sceneId);
});

test('confirming a past last cigarette opens support once, even if clicked twice', () => {
  const when = new Date('2026-11-02T10:00:00.000Z');
  const first = confirmLastCigarette(defaultQuitState(), when, 'entered', now);
  assert.equal(first.ok, true);
  assert.equal(first.state.appStage, 'support');
  assert.equal(first.state.smokingStatus, 'abstaining');
  assert.equal(first.state.intervals.length, 1);
  const again = confirmLastCigarette(first.state, new Date('2026-11-02T11:00:00.000Z'), 'now', now);
  assert.equal(again.unchanged, true);
  assert.equal(again.state.intervals.length, 1);
  assert.equal(again.state.intervals[0].startedAt, when.toISOString());
});

test('a future last-cigarette time is rejected', () => {
  const result = confirmLastCigarette(defaultQuitState(), new Date('2026-11-03T00:00:00.000Z'), 'entered', now);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'future_time');
});

test('I smoked closes the live timer and keeps the earlier stretch', () => {
  const started = confirmLastCigarette(defaultQuitState(), new Date('2026-11-01T08:00:00.000Z'), 'now', now).state;
  const smoked = recordSmoked(started, now, false, now);
  assert.equal(smoked.state.smokingStatus, 'smoking');
  assert.equal(smoked.state.currentIntervalId, null);
  assert.ok(smoked.state.intervals[0].endedAt);
  assert.equal(smoked.state.appStage, 'support');
  const restarted = recordSmoked(started, now, true, now);
  assert.equal(restarted.state.smokingStatus, 'abstaining');
  assert.equal(restarted.state.intervals.filter(item => !item.endedAt).length, 1);
});

test('a support row cannot be written back onto a scene', () => {
  const support = confirmLastCigarette(defaultQuitState(), now, 'now', now).state;
  const incoming = { ...defaultQuitState(), sceneId: 'pitcher', appStage: 'journey' };
  const frozen = protectSceneWrite(support, incoming);
  assert.equal(frozen.appStage, 'support');
  assert.equal(frozen.sceneId, support.sceneId);
  assert.equal(frozen.smokingStatus, 'abstaining');
});

test('the timer is elapsed wall time, not ticks', () => {
  assert.equal(formatSmokeFree('2026-11-01T12:00:00.000Z', Date.parse('2026-11-02T14:05:00.000Z')), '1d 2h 5m');
});
