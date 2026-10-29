import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act2-scene6');

test('scene 6 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-puff.webp', 'shot-paradox.webp', 'shot-starve.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 6 follows Boss Stress in Act 2', () => {
  assert.equal(neighbor('stress', 1), 'boredom');
  assert.equal(sceneOf('boredom').title, 'Bosses: Boredom and Concentration');
  assert.equal(sceneOf('boredom').act, 2);
  assert.equal(sceneOf('boredom').next, 'relax');
});
