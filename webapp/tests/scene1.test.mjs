import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {FILM,OPENING_KICKOFF,SHOTS,filmFinished,nextShotIndex} from '../src/scenes/act1/sceneFlow.ts';
import {sceneOf} from '../src/scenes/catalog.ts';

test('scene 1 is a film of four shots, then talk',()=>{
  assert.equal(SHOTS.length,4);
  assert.match(FILM,/\.mp4$/);
  assert.equal(nextShotIndex(0),1);
  assert.equal(nextShotIndex(3),3);
  assert.equal(filmFinished(0,true,false),false);
  assert.equal(filmFinished(3,true,true),true);
  assert.equal(filmFinished(3,false,false),true);
});

test('hidden kickoff is not a prepared question; the player sees a live opener',()=>{
  assert.match(OPENING_KICKOFF,/film/i);
  assert.doesNotMatch(OPENING_KICKOFF,/\?/);
  assert.equal(sceneOf('pitcher').openingLine,'Did anything in that scene feel familiar to you, or was your experience different?');
  assert.equal(sceneOf('firstPuff').openingLine,undefined);
});

test('developer skip arrows are gone and the next-scene offer can be declined',()=>{
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/scenes/act1/Scene1App.tsx'), 'utf8');
  assert.doesNotMatch(src,/scene1-skip/);
  assert.match(src,/Watch the next scene/);
  assert.match(src,/Keep talking about this/);
  assert.match(src,/offerOpen/);
  assert.match(src,/canAdvance: hidden.ready/);
  assert.match(src,/offerOpen: hidden.open/);
});
