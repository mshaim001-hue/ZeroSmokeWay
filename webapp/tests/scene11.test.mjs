import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act3-scene11');

test('scene 11 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-counter.webp', 'shot-gum.webp', 'shot-itch.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 11 follows the swamp in Act 3', () => {
  assert.equal(neighbor('swamp', 1), 'substitutes');
  assert.equal(sceneOf('substitutes').title, 'The Shop of Substitutes');
  assert.equal(sceneOf('substitutes').act, 3);
  assert.equal(sceneOf('substitutes').number, 11);
  assert.equal(sceneOf('substitutes').next, 'monster');
});
