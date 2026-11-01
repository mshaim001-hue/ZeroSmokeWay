import test from 'node:test';
import assert from 'node:assert/strict';
import { gateAfterKeepTalking, gateAfterModel, gateAfterUserTalk } from '../src/scenes/act1/offerState.ts';

test('offer, wait, keep talking, and launch stay distinct', () => {
  const offered = gateAfterModel({ ready: false, open: false }, 'offer');
  assert.deepEqual(offered, { ready: true, open: true, launch: false });

  const afterWait = gateAfterUserTalk({ ready: true, open: true });
  assert.deepEqual(afterWait, { ready: true, open: false });
  assert.equal(gateAfterModel(afterWait, 'stay').open, false);
  assert.equal(gateAfterModel(afterWait, 'stay').ready, true);

  const kept = gateAfterKeepTalking({ ready: true, open: true });
  assert.deepEqual(kept, { ready: true, open: false });

  const launch = gateAfterModel({ ready: true, open: true }, 'launch');
  assert.equal(launch.launch, true);
  assert.equal(launch.open, false);

  const premature = gateAfterModel({ ready: false, open: false }, 'launch');
  assert.equal(premature.launch, false);
  assert.equal(premature.open, true);
  assert.equal(premature.ready, true);
});
