import test from 'node:test';
import assert from 'node:assert/strict';
import {FILM,OPENING_KICKOFF,SHOTS,filmFinished,nextShotIndex} from '../src/scenes/act1/sceneFlow.ts';

test('scene 1 is a film of four shots, then talk',()=>{
  assert.equal(SHOTS.length,4);
  assert.match(FILM,/\.mp4$/);
  assert.equal(nextShotIndex(0),1);
  assert.equal(nextShotIndex(3),3);
  assert.equal(filmFinished(0,true,false),false);
  assert.equal(filmFinished(3,true,true),true);
  assert.equal(filmFinished(3,false,false),true);
});

test('first spoken line is requested from the model, not from a question bank',()=>{
  assert.match(OPENING_KICKOFF,/film/i);
  assert.doesNotMatch(OPENING_KICKOFF,/\?/);
});
