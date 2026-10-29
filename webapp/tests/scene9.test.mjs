import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act3-scene9');

test('scene 9 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-climb.webp', 'shot-rage.webp', 'shot-fall.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 9 opens Act 3 after Combined Cigarette', () => {
  assert.equal(neighbor('combo', 1), 'willpower');
  assert.equal(sceneOf('willpower').title, 'The Rocky Mountain of Willpower');
  assert.equal(sceneOf('willpower').act, 3);
  assert.equal(sceneOf('willpower').number, 9);
  assert.equal(sceneOf('willpower').next, 'swamp');
});
