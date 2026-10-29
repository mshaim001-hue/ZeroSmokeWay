import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act3-scene10');

test('scene 10 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-wait.webp', 'shot-drag.webp', 'shot-sink.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 10 follows Willpower in Act 3', () => {
  assert.equal(neighbor('willpower', 1), 'swamp');
  assert.equal(sceneOf('swamp').title, 'The Swamp of Cutting Down');
  assert.equal(sceneOf('swamp').act, 3);
  assert.equal(sceneOf('swamp').number, 10);
  assert.equal(sceneOf('swamp').next, null);
});
