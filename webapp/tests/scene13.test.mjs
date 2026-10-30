import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act4-scene13');

test('scene 13 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-drag.webp', 'shot-stub.webp', 'shot-door.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 13 is the last-cigarette ritual between the lair and the three weeks', () => {
  assert.equal(neighbor('monster', 1), 'ritual');
  assert.equal(neighbor('ritual', 1), 'weeks');
  assert.equal(sceneOf('ritual').title, 'The Ritual of the Last Cigarette');
  assert.equal(sceneOf('ritual').act, 4);
  assert.equal(sceneOf('ritual').number, 13);
  assert.equal(sceneOf('ritual').next, 'weeks');
  assert.equal(sceneOf('ritual').afterLabel, 'I am free');
});
