import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act1-scene2');

test('scene 2 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-drink.webp', 'shot-sting.webp', 'shot-loop.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});
