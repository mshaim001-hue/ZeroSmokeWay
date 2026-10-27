import test from 'node:test';
import assert from 'node:assert/strict';
import {OPENING_KICKOFF} from '../src/scenes/act1/sceneFlow.ts';

test('opening kickoff is a hidden cue, not a prepared question shown to the player',()=>{
  assert.ok(OPENING_KICKOFF.endsWith('.'));
  assert.doesNotMatch(OPENING_KICKOFF,/когда захочешь/i);
});
