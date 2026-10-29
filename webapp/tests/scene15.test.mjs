import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf, SCENE_ORDER } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act4-scene15');

test('scene 15 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-sky.webp', 'shot-pity.webp', 'shot-free.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 15 is the finale after the first three weeks', () => {
  assert.equal(neighbor('weeks', 1), 'truth');
  assert.equal(SCENE_ORDER.at(-1), 'truth');
  assert.equal(sceneOf('truth').title, 'The Moment of Truth');
  assert.equal(sceneOf('truth').act, 4);
  assert.equal(sceneOf('truth').number, 15);
  assert.equal(sceneOf('truth').next, null);
  assert.equal(sceneOf('truth').afterLabel, 'You are free forever');
});
