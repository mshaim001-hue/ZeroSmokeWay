import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLilaMove } from '../services/lilaBoard.js';
import { buildLilaInstruction, resolveDiceReady } from '../services/lilaOrchestration.js';
import { acceptsLilaSummary, updateLilaSummary } from '../services/lilaCompletion.js';
import { EMPTY_CARR_COVERAGE, finalizeAnamnesisCoverage, mergeCarrCoverage } from '../services/anamnesisCoverage.js';
import { extractLilaCoverage } from '../services/lilaExtraction.js';

const lilaState = { position: 12, gameEntered: true, visitedCells: [1, 12] };

test('a reply or correction does not force the next roll', () => {
  for (const message of ['Не понимаю', 'Нет, я уже не курил год', 'Не знаю', 'Хочу рассказать историю']) {
    assert.equal(resolveDiceReady({ message, lilaState, agentDiceReady: false }), false);
    assert.match(buildLilaInstruction({ message, lilaState, gameEntered: true }), /12 «Привязанность»/);
  }
  assert.equal(resolveDiceReady({ message: 'Идём дальше', lilaState, agentDiceReady: true }), true);
  assert.equal(resolveDiceReady({ message: 'Не понимаю', lilaState, agentDiceReady: 'false' }), false);
});

test('entry and new-cell mechanics still take precedence over the model', () => {
  const outside = { position: 0, gameEntered: false, visitedCells: [] };
  const failed = applyLilaMove(outside, 2);
  assert.equal(resolveDiceReady({ message: '🎲 2', lilaState: outside, move: failed, agentDiceReady: false }), true);
  const entry = applyLilaMove(outside, 6);
  assert.equal(entry.position, 1);
  assert.equal(resolveDiceReady({ message: '🎲 6', lilaState: entry, move: entry, agentDiceReady: true }), false);
});

test('a populated questionnaire alone cannot accept the game summary', () => {
  const coverage = structuredClone(EMPTY_CARR_COVERAGE);
  coverage.quantitative.yearsInTrap = { value: 10, confidence: 1 };
  coverage.quantitative.cigarettesPerDay = { value: 20, confidence: 1 };
  coverage.attempts.maxAbstinenceDays = { value: 365, confidence: 1 };
  coverage.attempts.relapseReasons = { items: ['не уточнено'], confidence: 1 };
  const snapshot = finalizeAnamnesisCoverage({ carrCoverage: coverage });
  assert.ok(snapshot.coverageScore > 0.72);
  assert.equal(acceptsLilaSummary('Перейти к разбору мифов', snapshot), false);
});

test('transition requires the dedicated choice and a current summary; correction clears it', () => {
  const snapshot = updateLilaSummary({}, 'Сигарета связана с паузой после работы.');
  assert.equal(acceptsLilaSummary('Перейти к разбору мифов', snapshot), true);
  assert.equal(acceptsLilaSummary('Я не хочу перейти к разбору мифов', snapshot), false);
  assert.equal(acceptsLilaSummary('Да', snapshot), false);
  assert.equal(acceptsLilaSummary('Перейти к разбору мифов', updateLilaSummary(snapshot, null)), false);
});

test('a shorter correction supersedes earlier evidence', () => {
  const prior = structuredClone(EMPTY_CARR_COVERAGE);
  prior.illusions.stress = { suspected: true, evidence: 'Длинная прежняя интерпретация о снятии стресса сигаретой' };
  const updated = mergeCarrCoverage(prior, { illusions: { stress: { suspected: false, evidence: 'Нет, это пауза' } } });
  assert.deepEqual(updated.illusions.stress, { suspected: false, evidence: 'Нет, это пауза' });
});

test('silent extraction skips dice, returns data, and tolerates failure', async () => {
  let calls = 0;
  const openai = { chat: { completions: { create: async () => {
    calls++;
    return { choices: [{ message: { content: '{"carrCoverage":{"illusions":{"work":{"suspected":true,"evidence":"после задачи"}}}}' } }] };
  } } } };
  const params = { openai, model: 'test', history: [], priorCoverage: {} };
  assert.equal(await extractLilaCoverage({ ...params, message: '🎲 4' }), null);
  assert.equal(calls, 0);
  const extracted = await extractLilaCoverage({ ...params, message: 'После задачи выхожу покурить' });
  assert.equal(extracted.carrCoverage.illusions.work.suspected, true);
  openai.chat.completions.create = async () => { throw new Error('Unavailable'); };
  assert.equal(await extractLilaCoverage({ ...params, message: 'Не понимаю' }), null);
});
