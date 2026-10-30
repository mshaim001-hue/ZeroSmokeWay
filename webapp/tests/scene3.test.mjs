import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf, SCENE_ORDER } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act1-scene3');

test('scene 3 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-last.webp', 'shot-myth.webp', 'shot-peel.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 3 follows the first cigarette in the catalog', () => {
  assert.deepEqual(SCENE_ORDER, ['pitcher', 'firstPuff', 'labyrinth', 'shoes', 'stress', 'boredom', 'relax', 'combo', 'willpower', 'swamp', 'substitutes', 'monster', 'ritual', 'weeks', 'truth']);
  assert.equal(sceneOf('firstPuff').next, 'labyrinth');
  assert.equal(neighbor('firstPuff', 1), 'labyrinth');
  assert.equal(sceneOf('labyrinth').title, 'The Brainwashing Labyrinth');
  assert.equal(sceneOf('labyrinth').next, 'shoes');
});
