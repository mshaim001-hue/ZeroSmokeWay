import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act2-scene7');

test('scene 7 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-wait.webp', 'shot-frost.webp', 'shot-vice.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 7 follows Boredom in Act 2', () => {
  assert.equal(neighbor('boredom', 1), 'relax');
  assert.equal(sceneOf('relax').title, 'Boss: Relaxation');
  assert.equal(sceneOf('relax').act, 2);
  assert.equal(sceneOf('relax').next, 'combo');
});
