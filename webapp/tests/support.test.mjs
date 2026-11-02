import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BODY_CARDS, milestoneProgress, upcomingMilestone, visibleBodyCards } from '../src/support/bodyCards.ts';
import { allStretchesMs, estimateFromMs, parseEstimates } from '../src/support/estimates.ts';
import { formatSmokeFree, smokeFreeClock } from '../src/support/timer.ts';
import { defaultProgress } from '../src/auth/progressModel.ts';

const root = dirname(fileURLToPath(import.meta.url));

test('body cards are a fixed list with sources, not generated copy', () => {
  assert.ok(BODY_CARDS.length >= 3);
  for (const card of BODY_CARDS) {
    assert.ok(card.source.url.startsWith('https://'));
    assert.ok(card.body.includes('not') || card.body.includes('population') || card.body.includes('general'));
  }
  const early = visibleBodyCards('2026-11-02T12:00:00.000Z', false, Date.parse('2026-11-02T12:10:00.000Z'));
  assert.equal(early.length, 0);
  const twenty = visibleBodyCards('2026-11-02T12:00:00.000Z', false, Date.parse('2026-11-02T12:20:00.000Z'));
  assert.equal(twenty[0].id, '20min');
  assert.ok(BODY_CARDS.find(card => card.id === '1y')?.source.url.includes('nhs.uk'));
  assert.ok(BODY_CARDS.find(card => card.id === '3-6y')?.source.url.includes('cdc.gov'));
});

test('the next milestone is visible before 20 minutes and is not marked reached', () => {
  const at = Date.parse('2026-11-02T12:10:00.000Z');
  const next = upcomingMilestone('2026-11-02T12:00:00.000Z', at);
  assert.equal(next?.id, '20min');
  const state = milestoneProgress('2026-11-02T12:00:00.000Z', at);
  assert.equal(state.reached.length, 0);
  assert.equal(state.next?.id, '20min');
  assert.ok(state.ratio > 0 && state.ratio < 1);
});

test('smoke-free copy uses the confirmed timestamp and shows seconds in the first minutes', () => {
  assert.equal(formatSmokeFree('2026-11-01T12:00:00.000Z', Date.parse('2026-11-02T14:05:00.000Z')), '1d 2h 5m');
  const live = smokeFreeClock('2026-11-02T12:00:00.000Z', Date.parse('2026-11-02T12:00:08.000Z'));
  assert.equal(live.showSeconds, true);
  assert.equal(live.seconds, 8);
  const later = smokeFreeClock('2026-11-02T12:00:00.000Z', Date.parse('2026-11-02T12:20:00.000Z'));
  assert.equal(later.showSeconds, false);
});

test('estimates use confirmed settings and skip time spent smoking again', () => {
  assert.equal(parseEstimates({ quote: 'I smoke a pack' }), null);
  const estimates = parseEstimates({ cigarettesPerDay: 10, packPrice: 10, packSize: 20, currency: 'usd' });
  assert.equal(estimates?.currency, 'USD');
  const day = estimateFromMs(estimates, 86400000);
  assert.equal(day.cigarettes, 10);
  assert.equal(day.money, 5);
  const progress = {
    ...defaultProgress(),
    appStage: 'support',
    smokingStatus: 'smoking',
    estimates,
    intervals: [
      { id: 'a', startedAt: '2026-11-01T00:00:00.000Z', endedAt: '2026-11-02T00:00:00.000Z', source: 'now' },
      { id: 'b', startedAt: '2026-11-03T00:00:00.000Z', endedAt: '2026-11-03T12:00:00.000Z', source: 'entered' },
    ],
  };
  const all = allStretchesMs(progress.intervals, Date.parse('2026-11-04T00:00:00.000Z'));
  assert.equal(all, 86400000 + 12 * 3600000);
  const totals = estimateFromMs(estimates, all);
  assert.equal(totals.cigarettes, 15);
});

test('scene 15 has the last-cigarette CTA and confirmation, not a next film', () => {
  const scene = readFileSync(join(root, '../src/scenes/act1/Scene1App.tsx'), 'utf8');
  assert.match(scene, /I’m ready to smoke my last cigarette and go on/);
  assert.match(scene, /LastCigaretteDialog/);
  assert.doesNotMatch(scene, /Watch the next scene[\s\S]*truth/);
});

test('home keeps support, about, and feedback without blocking support', () => {
  const home = readFileSync(join(root, '../src/support/SupportHome.tsx'), 'utf8');
  const today = readFileSync(join(root, '../src/support/TodayScreen.tsx'), 'utf8');
  const quit = readFileSync(join(root, '../src/support/quitApi.ts'), 'utf8');
  assert.match(home, />Today</);
  assert.match(home, />Progress</);
  assert.match(home, />Support</);
  assert.match(today, /Talk to Muse/);
  assert.match(home, /\/feedback.html/);
  assert.match(home, /\/about.html/);
  assert.match(home, /I smoked/);
  assert.match(home, /Record that I smoked/);
  assert.match(home, /Support the project/);
  assert.match(home, /ko-fi.com\/underdot/);
  assert.match(home, /noopener noreferrer/);
  assert.match(today, /Your smoke-free time/);
  assert.match(today, /Help ZeroSmokeWay grow/);
  assert.doesNotMatch(home, /saveProgress/);
  assert.match(quit, /save_support_content/);
  assert.match(quit, /save_quit_estimates/);
  assert.doesNotMatch(quit, /saveSupportContent[\s\S]*applyQuitSnapshot/);
});

test('talk to Muse stays separate from supporting the project', () => {
  const today = readFileSync(join(root, '../src/support/TodayScreen.tsx'), 'utf8');
  const chat = readFileSync(join(root, '../src/support/SupportHome.tsx'), 'utf8');
  assert.match(today, /Talk to Muse/);
  assert.match(today, /ko-fi.com\/underdot/);
  assert.doesNotMatch(chat.split('support-chat')[1] ?? '', /ko-fi/);
  assert.doesNotMatch(chat.split('LastCigaretteDialog')[1] ?? '', /ko-fi/);
});

test('feedback page does not attach the conversation', () => {
  const page = readFileSync(join(root, '../public/feedback.html'), 'utf8');
  assert.match(page, /does not send your talk/);
});
