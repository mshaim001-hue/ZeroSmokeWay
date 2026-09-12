import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptsStage2Handoff,
  collectInitialAnswer,
  handleWhyISmokePhase,
  looksLikePlayButton,
  looksLikeReadinessConfirmation,
  STAGE2_CTA,
} from '../services/whyISmokeGame/journey.js';
import { HANDOFF_COPY } from '../services/whyISmokeGame/constants.js';
import { EMPTY_CARR_COVERAGE, mergeCarrCoverage } from '../services/anamnesisCoverage.js';

test('play starts the first roll without an initial answer', async () => {
  const landed = await handleWhyISmokePhase({
    message: '🎲 3',
    conversationHistory: [],
  }, {
    runMaster: async ({ session, extra }) => ({
      session,
      message: extra.firstVisit ? 'Гнев.\n\nГде появилась сигарета?' : 'нет',
      diceReady: false,
    }),
  });
  assert.equal(landed.kind, 'master');
  assert.equal(landed.session.initialAnswer, '');
  assert.equal(landed.lilaState.position, 3);
  assert.equal(landed.diceReady, false);
  assert.match(landed.response, /Гнев/);
  assert.doesNotMatch(landed.response, /Брось кубик/);
  assert.match(landed.boardStatus, /Гнев/);
});

test('play button without a roll still opens a cell and calls the master', async () => {
  const landed = await handleWhyISmokePhase({
    message: 'Играть',
  }, {
    runMaster: async ({ session }) => ({
      session,
      message: 'Первый вопрос',
      diceReady: false,
    }),
  });
  assert.ok(landed.lilaState.position >= 1 && landed.lilaState.position <= 6);
  assert.equal(landed.diceReady, false);
  assert.match(landed.response, /Первый вопрос/);
});

test('a later roll is blocked until the first question is answered', async () => {
  const landed = await handleWhyISmokePhase({
    message: '🎲 2',
  }, {
    runMaster: async ({ session }) => ({ session, message: 'Что здесь?', diceReady: false }),
  });
  const blocked = await handleWhyISmokePhase({
    message: '🎲 3',
    anamnesis: { whyISmokeGame: landed.session },
  }, { runMaster: async () => { throw new Error('blocked roll must not call master'); } });
  assert.equal(blocked.kind, 'wait_answer');
});

test('master failure on the first cell asks an episode question, not for a roll', async () => {
  const entered = await handleWhyISmokePhase({
    message: '🎲 1',
  }, { runMaster: async () => { throw new Error('OpenAI client is required'); } });
  assert.equal(entered.kind, 'error');
  assert.equal(entered.diceReady, false);
  assert.equal(entered.lilaState.position, 1);
  assert.match(entered.response, /Рождение/);
  assert.doesNotMatch(entered.response, /нет контекста|брось кубик|вход/i);
});

test('optional prestart text is stored and does not start the game', async () => {
  let called = 0;
  const result = await handleWhyISmokePhase({
    message: 'Потому что мне нравится',
  }, { runMaster: async () => { called += 1; throw new Error('should not run'); } });
  assert.equal(called, 0);
  assert.equal(result.diceReady, false);
  assert.match(result.pendingInitialAnswer, /нравится/);
  assert.match(result.response, /Играть/);
});

test('a populated questionnaire alone cannot accept the handoff CTA', () => {
  const coverage = structuredClone(EMPTY_CARR_COVERAGE);
  coverage.quantitative.yearsInTrap = { value: 10, confidence: 1 };
  coverage.quantitative.cigarettesPerDay = { value: 20, confidence: 1 };
  const snapshot = { carrCoverage: coverage };
  assert.equal(acceptsStage2Handoff('Перейти к разбору', snapshot), false);
  assert.equal(acceptsStage2Handoff('Перейти к разбору мифов', { lilaJourneySummary: 'пауза' }), true);
});

test('play button is recognized', () => {
  assert.equal(looksLikePlayButton('Играть'), true);
  assert.equal(looksLikePlayButton('🎲 Играть'), true);
  assert.equal(looksLikeReadinessConfirmation('Начать игру'), true);
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
  assert.equal(collectInitialAnswer([
    { text: 'Играть', isUser: true },
    { text: '🎲 6', isUser: true },
    { text: 'После задачи выхожу', isUser: true },
  ]), 'После задачи выхожу');
});
