import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act4-scene12');

test('scene 12 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-lair.webp', 'shot-itch.webp', 'shot-starve.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 12 opens Act 4 after the Shop of Substitutes', () => {
  assert.equal(neighbor('substitutes', 1), 'monster');
  assert.equal(sceneOf('monster').title, 'The Lair of the Little Nicotine Monster');
  assert.equal(sceneOf('monster').act, 4);
  assert.equal(sceneOf('monster').number, 12);
  assert.equal(sceneOf('monster').next, 'ritual');
});
