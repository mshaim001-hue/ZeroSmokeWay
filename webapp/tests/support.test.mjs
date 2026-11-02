import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BODY_CARDS, visibleBodyCards } from '../src/support/bodyCards.ts';
import { formatSmokeFree } from '../src/support/timer.ts';

const root = dirname(fileURLToPath(import.meta.url));

test('body cards are a fixed list with sources, not generated copy', () => {
  assert.ok(BODY_CARDS.length >= 3);
  for (const card of BODY_CARDS) {
    assert.ok(card.source.url.startsWith('https://'));
    assert.ok(card.body.includes('not') || card.body.includes('population') || card.body.includes('general'));
  }
  const early = visibleBodyCards('2026-11-02T12:00:00.000Z', false, Date.parse('2026-11-02T12:10:00.000Z'));
  assert.equal(early.length, 1);
  assert.equal(early[0].id, '20min');
});

test('smoke-free copy uses the confirmed timestamp', () => {
  assert.equal(formatSmokeFree('2026-11-01T12:00:00.000Z', Date.parse('2026-11-02T14:05:00.000Z')), '1d 2h 5m');
});

test('scene 15 has the last-cigarette CTA and confirmation, not a next film', () => {
  const scene = readFileSync(join(root, '../src/scenes/act1/Scene1App.tsx'), 'utf8');
  assert.match(scene, /I’m ready to smoke my last cigarette and go on/);
  assert.match(scene, /LastCigaretteDialog/);
  assert.doesNotMatch(scene, /Watch the next scene[\s\S]*truth/);
});

test('home keeps support, about, and feedback without blocking support', () => {
  const home = readFileSync(join(root, '../src/support/SupportHome.tsx'), 'utf8');
  assert.match(home, />Support</);
  assert.match(home, /\/feedback.html/);
  assert.match(home, /\/about.html/);
  assert.match(home, /I smoked/);
  assert.match(home, /Record that I smoked/);
});

test('feedback page does not attach the conversation', () => {
  const page = readFileSync(join(root, '../public/feedback.html'), 'utf8');
  assert.match(page, /does not send your talk/);
});
