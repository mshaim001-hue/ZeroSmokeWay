import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neighbor, sceneOf } from '../src/scenes/catalog.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../public/game/act2-scene5');

test('scene 5 film and four shots are in public assets', () => {
  for (const name of ['scene.mp4', 'shot-wide.webp', 'shot-storm.webp', 'shot-drag.webp', 'shot-graph.webp']) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
});

test('scene 5 opens Act 2 after the tight shoes', () => {
  assert.equal(neighbor('shoes', 1), 'stress');
  assert.equal(sceneOf('stress').title, 'Boss: Stress');
  assert.equal(sceneOf('stress').act, 2);
  assert.equal(sceneOf('stress').next, null);
});
