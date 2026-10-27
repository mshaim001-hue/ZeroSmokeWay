import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act1-scene4');

test('scene 4 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-pinch.webp', 'shot-off.webp', 'shot-back.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 4 follows the labyrinth in the catalog', () => {
  assert.equal(neighbor('labyrinth', 1), 'shoes');
  assert.equal(sceneOf('shoes').title, 'The Tight Shoes Paradox');
  assert.equal(sceneOf('shoes').next, null);
});
