import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act4-scene14');

test('scene 14 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-coffee.webp', 'shot-scream.webp', 'shot-hold.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 14 follows the lair in Act 4', () => {
  assert.equal(neighbor('monster', 1), 'weeks');
  assert.equal(sceneOf('weeks').title, 'Trial: The First Three Weeks');
  assert.equal(sceneOf('weeks').act, 4);
  assert.equal(sceneOf('weeks').number, 14);
  assert.equal(sceneOf('weeks').next, 'truth');
});
