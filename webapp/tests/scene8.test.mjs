import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act2-scene8');

test('scene 8 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-wait.webp', 'shot-pack.webp', 'shot-drag.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 8 follows Relaxation in Act 2', () => {
  assert.equal(neighbor('relax', 1), 'combo');
  assert.equal(sceneOf('combo').title, 'Boss: Combined Cigarette');
  assert.equal(sceneOf('combo').act, 2);
  assert.equal(sceneOf('combo').next, 'willpower');
});
