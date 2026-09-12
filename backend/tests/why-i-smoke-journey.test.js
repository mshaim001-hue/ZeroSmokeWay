import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptsStage2Handoff,
  collectInitialAnswer,
  handleWhyISmokePhase,
  looksLikeReadinessConfirmation,
  STAGE2_CTA,
} from '../services/whyISmokeGame/journey.js';
import { HANDOFF_COPY } from '../services/whyISmokeGame/constants.js';
import { EMPTY_CARR_COVERAGE, mergeCarrCoverage } from '../services/anamnesisCoverage.js';

test('prestart text is stored and does not call the master', async () => {
  let called = 0;
  const result = await handleWhyISmokePhase({
    message: 'Курю после работы на балконе',
    conversationHistory: [],
  }, { runMaster: async () => { called += 1; throw new Error('should not run'); } });
  assert.equal(called, 0);
  assert.equal(result.diceReady, false);
  assert.match(result.pendingInitialAnswer, /балконе/);
  assert.match(result.response, /Начать игру/);
});

test('start uses earlier words as initialAnswer and failed entry stays mechanical', async () => {
  const started = await handleWhyISmokePhase({
    message: 'Начать игру',
    conversationHistory: [{ text: 'После созвона сразу на балкон', isUser: true }],
    anamnesis: { pendingInitialAnswer: 'Не знаю почему курю' },
  }, { runMaster: async () => { throw new Error('no master on start'); } });
  assert.equal(started.kind, 'start');
  assert.equal(started.diceReady, true);
  assert.match(started.session.initialAnswer, /созвона/);
  assert.match(started.session.initialAnswer, /Не знаю/);

  const failed = await handleWhyISmokePhase({
    message: '🎲 2',
    anamnesis: { whyISmokeGame: started.session },
  }, { runMaster: async () => { throw new Error('no master on failed entry'); } });
  assert.equal(failed.kind, 'failed_entry');
  assert.equal(failed.diceReady, true);
  assert.match(failed.boardStatus, /Выпало 2 — нужна 6/);
});

test('master failure after entry keeps the cell and asks to write, not roll', async () => {
  const started = await handleWhyISmokePhase({ message: 'Начать игру' }, { runMaster: async () => ({}) });
  const entered = await handleWhyISmokePhase({
    message: '🎲 6',
    anamnesis: { whyISmokeGame: started.session },
  }, { runMaster: async () => { throw new Error('OpenAI client is required'); } });
  assert.equal(entered.kind, 'error');
  assert.equal(entered.diceReady, false);
  assert.equal(entered.lilaState.gameEntered, true);
  assert.equal(entered.lilaState.position, 1);
  assert.match(entered.response, /Рождение/);
  assert.doesNotMatch(entered.response, /брось кубик/i);
});

test('a landed cell asks the master; a second roll is blocked until an answer', async () => {
  const started = await handleWhyISmokePhase({ message: 'Начать игру' }, { runMaster: async () => ({}) });
  const entered = await handleWhyISmokePhase({
    message: '🎲 6',
    anamnesis: { whyISmokeGame: started.session },
  }, {
    runMaster: async ({ session, extra }) => ({
      session,
      message: extra.event === 'new_cell' ? 'Что осталось от первой сигареты?' : 'нет',
      diceReady: false,
    }),
  });
  assert.match(entered.response, /первой сигареты/);
  assert.equal(entered.diceReady, false);

  const blocked = await handleWhyISmokePhase({
    message: '🎲 3',
    anamnesis: { whyISmokeGame: entered.session },
  }, { runMaster: async () => { throw new Error('blocked roll must not call master'); } });
  assert.equal(blocked.kind, 'wait_answer');
});

test('a populated questionnaire alone cannot accept the handoff CTA', () => {
  const coverage = structuredClone(EMPTY_CARR_COVERAGE);
  coverage.quantitative.yearsInTrap = { value: 10, confidence: 1 };
  coverage.quantitative.cigarettesPerDay = { value: 20, confidence: 1 };
  const snapshot = { carrCoverage: coverage };
  assert.equal(acceptsStage2Handoff('Перейти к разбору', snapshot), false);
  assert.equal(acceptsStage2Handoff('Перейти к разбору мифов', { lilaJourneySummary: 'пауза' }), true);
  assert.equal(acceptsStage2Handoff('Да', { lilaJourneySummary: 'пауза' }), false);
});

test('start accepts a button and natural readiness', () => {
  assert.equal(looksLikeReadinessConfirmation('Начать игру'), true);
  assert.equal(looksLikeReadinessConfirmation('Я готов. ' + 'Моя история. '.repeat(20)), true);
  assert.equal(looksLikeReadinessConfirmation('Я не готов'), false);
});

test('a shorter coverage correction supersedes earlier evidence', () => {
  const prior = structuredClone(EMPTY_CARR_COVERAGE);
  prior.illusions.stress = { suspected: true, evidence: 'Длинная прежняя интерпретация о снятии стресса сигаретой' };
  const updated = mergeCarrCoverage(prior, { illusions: { stress: { suspected: false, evidence: 'Нет, это пауза' } } });
  assert.deepEqual(updated.illusions.stress, { suspected: false, evidence: 'Нет, это пауза' });
});

test('handoff CTA is accepted only when the game finished', () => {
  assert.equal(acceptsStage2Handoff(STAGE2_CTA, {}), false);
  assert.equal(acceptsStage2Handoff(STAGE2_CTA, {
    stage2Handoff: { userFinalExplanation: 'пауза', transition: HANDOFF_COPY },
  }), true);
  assert.equal(acceptsStage2Handoff('Перейти к разбору мифов', {
    whyISmokeGame: { handoff: { userFinalExplanation: 'пауза' } },
  }), true);
  assert.equal(collectInitialAnswer([
    { text: 'Начать игру', isUser: true },
    { text: '🎲 6', isUser: true },
    { text: 'После задачи выхожу', isUser: true },
  ]), 'После задачи выхожу');
});
