import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GAME_MASTER_PROMPT,
  GAME_PHASE,
  HANDOFF_COPY,
  HYPOTHESIS_STATUS,
  SESSION_STATUS,
  addSessionHypothesis,
  applyGameMasterResult,
  buildGameMasterContext,
  buildGameMasterMessages,
  buildMirror,
  buildStage2Handoff,
  createDefinition,
  createGameSession,
  evaluateSaturation,
  finalizeWithEcho,
  interpretGameMasterOutput,
  normalizeGameMasterResult,
  resolvePersonalizedTitle,
} from '../services/whyISmokeGame/index.js';

function researchedSession(overrides = {}) {
  let session = createGameSession({
    initialAnswer: 'Наверное, просто привычка и пауза после работы',
    ...overrides,
  });
  session = addSessionHypothesis(session, {
    id: 'hyp_pause',
    statement: 'Сигарета стала способом разрешить себе паузу после законченной задачи.',
    status: HYPOTHESIS_STATUS.SUPPORTED,
    timesObserved: 3,
    hasBeenRealityChecked: true,
    evidence: [
      { text: 'После задачи сразу выхожу покурить', turnNumber: 2 },
      { text: 'Без сигареты пауза ощущается неполноценной', turnNumber: 5 },
    ],
  });
  session = {
    ...session,
    entered: true,
    currentPosition: 4,
    turnNumber: 8,
    userRecognizedHypothesisIds: ['hyp_pause'],
    turns: Array.from({ length: 8 }, (_, i) => ({
      turnNumber: i + 1,
      diceValue: 2,
      fromPosition: i,
      toPosition: i + 1,
      cellId: 'pause',
      cellTitleShownToUser: 'Пауза',
      userAnswer: i >= 5 ? 'Мы это уже обсуждали, после задачи всё так же' : `После задачи выхожу покурить ${i + 1}`,
      affectedHypothesisIds: ['hyp_pause'],
      aiQuestion: 'Что происходит сразу после задачи?',
    })),
  };
  return session;
}

test('game master prompt is a separate investigation config', () => {
  const prompt = GAME_MASTER_PROMPT;
  const agentConfig = readFileSync(new URL('../services/agentConfig.js', import.meta.url), 'utf8');
  assert.match(prompt, /ОДИН основной вопрос/);
  assert.match(prompt, /Не выдавай гипотезу как факт/);
  assert.match(prompt, /контрпример/);
  assert.match(prompt, /замену сигарете/);
  assert.match(prompt, /internalName/);
  assert.match(prompt, /Почему ты до сих пор куришь/);
  assert.match(prompt, /hypothesisUpdates/);
  assert.match(prompt, /не защищай/);
  assert.match(agentConfig, /why_i_smoke_master/);
  assert.match(agentConfig, /GAME_MASTER_PROMPT/);
});

test('context given to the master includes intention, path, hypotheses and turn count', () => {
  const definition = createDefinition();
  const session = researchedSession();
  const context = buildGameMasterContext({
    session,
    definition,
    userMessage: 'После созвона выхожу на балкон',
  });
  assert.equal(context.intention, 'Почему я до сих пор курю?');
  assert.match(context.initialAnswer, /пауза/);
  assert.equal(context.turnNumber, 8);
  assert.ok(context.recentAnswers.length > 0);
  assert.equal(context.activeHypotheses[0].id, 'hyp_pause');
  assert.ok(!('confidence' in context.activeHypotheses[0]));
  const packed = buildGameMasterMessages({ session, definition, userMessage: 'ок' });
  assert.match(packed.user, /Намерение/);
  assert.match(packed.user, /Активные гипотезы/);
});

test('structured result keeps a single question and applies hypothesis updates', () => {
  let session = createGameSession({ initialAnswer: 'Не знаю' });
  session = {
    ...session,
    entered: true,
    turnNumber: 1,
    turns: [{
      turnNumber: 1,
      diceValue: 6,
      fromPosition: 0,
      toPosition: 1,
      cellId: 'birth',
      cellTitleShownToUser: 'Рождение',
      userAnswer: 'Первую украл у отца',
      affectedHypothesisIds: [],
    }],
  };

  const applied = applyGameMasterResult(session, createDefinition(), {
    observation: 'Есть конкретный старт',
    messageToUser: 'Похоже, здесь может быть связь с тем, как сигарета вообще вошла в жизнь.',
    question: 'Что от той первой осталось сегодня? А ещё как ты куришь утром? И что насчёт стресса?',
    hypothesisUpdates: [
      { action: 'create', statement: 'Первая сигарета задала ритуал “взять чужое и спрятаться”.' },
    ],
    patterns: [{ trigger: 'напряжение дома', action: 'взял сигарету' }],
  });

  assert.equal(applied.result.question.includes('?'), true);
  assert.equal(applied.result.question.includes('утром'), false);
  assert.equal(applied.session.hypotheses.length, 1);
  assert.equal(applied.session.hypotheses[0].status, HYPOTHESIS_STATUS.CANDIDATE);
  assert.equal(applied.session.discoveredPatterns[0].trigger, 'напряжение дома');
});

test('a counterexample weakens or discards a pretty hypothesis instead of defending it', () => {
  let session = researchedSession();
  session = applyGameMasterResult(session, createDefinition(), {
    messageToUser: 'Тогда гипотеза про паузу не держится.',
    question: 'Если пауза без сигареты у тебя уже была, что тогда делает утренняя?',
    hypothesisUpdates: [
      {
        action: 'add_counter_evidence',
        hypothesisId: 'hyp_pause',
        text: 'Три месяца не курил и всё равно выходил с кофе',
      },
      { action: 'weaken', hypothesisId: 'hyp_pause', text: 'пауза сохранялась без сигареты' },
    ],
  }).session;

  assert.equal(session.hypotheses[0].status, HYPOTHESIS_STATUS.WEAKENED);
  assert.ok(session.hypotheses[0].counterEvidence.length >= 1);

  session = applyGameMasterResult(session, createDefinition(), {
    messageToUser: 'Эту линию закрываем.',
    question: 'Где сигарета появляется, если не в паузе?',
    hypothesisUpdates: [{ action: 'discard', hypothesisId: 'hyp_pause', text: 'человек не узнаёт паузу' }],
  }).session;
  assert.equal(session.hypotheses[0].status, HYPOTHESIS_STATUS.DISCARDED);
});

test('cell display title personalizes only when it follows the user words', () => {
  const cell = { id: 'automaton', title: 'Автомат' };
  const recentAnswers = [{ text: 'После созвона сразу на балкон, даже не думаю' }];
  assert.equal(resolvePersonalizedTitle({
    cell,
    proposed: 'Балкон после созвона',
    recentAnswers,
    lastPersonalizedTurn: -10,
    turnNumber: 4,
  }), 'Балкон после созвона');
  assert.equal(resolvePersonalizedTitle({
    cell,
    proposed: 'Балкон после созвона',
    recentAnswers,
    lastPersonalizedTurn: 3,
    turnNumber: 4,
  }), null);
  assert.equal(resolvePersonalizedTitle({
    cell,
    proposed: 'Архетип автоматизма',
    recentAnswers,
    turnNumber: 4,
  }), null);
});

test('turn count alone does not finish the game', () => {
  const session = createGameSession();
  session.turnNumber = 20;
  session.turns = Array.from({ length: 20 }, (_, i) => ({
    turnNumber: i + 1,
    cellId: 'habit',
    userAnswer: 'не знаю',
    affectedHypothesisIds: [],
  }));
  const saturation = evaluateSaturation(session);
  assert.equal(saturation.hardLimitReached, true);
  assert.equal(saturation.possible, false);
  assert.equal(saturation.readyForMirror, false);
});

test('saturation needs stable hypotheses, episodes, reality check and repetition', () => {
  const session = researchedSession();
  const saturation = evaluateSaturation(session, { aiPossible: true, userRecognizes: true });
  assert.equal(saturation.possible, true);
  assert.ok(saturation.reasons.includes('stable_hypotheses'));
  assert.ok(saturation.reasons.includes('reality_checked'));
  assert.ok(saturation.reasons.includes('repeating_turns'));
});

test('circling and reality check happen before mirror, then handoff does not start stage 2', () => {
  const definition = createDefinition();
  let session = researchedSession();
  let out = applyGameMasterResult(session, definition, {
    messageToUser: 'Похоже, мы уже начали ходить вокруг одной и той же вещи. Проверим ещё одну гипотезу.',
    question: 'Узнаёшь, что сигарета разрешает паузу после задачи?',
    shouldRealityCheck: true,
    possibleSaturation: true,
    userRecognizesHypothesis: false,
  });
  assert.equal(out.session.phase, GAME_PHASE.REALITY_CHECK);
  assert.equal(out.session.status, SESSION_STATUS.ACTIVE);
  assert.equal(out.diceReady, false);

  out = interpretGameMasterOutput({
    session: out.session,
    definition,
    raw: {
      messageToUser: 'Ты это узнаёшь.',
      question: '',
      possibleSaturation: true,
      userRecognizesHypothesis: true,
      hypothesisUpdates: [{ action: 'reality_check', hypothesisId: 'hyp_pause', recognized: true }],
    },
  });
  assert.equal(out.session.phase, GAME_PHASE.MIRROR);
  assert.equal(out.session.status, SESSION_STATUS.REFLECTION);
  assert.match(out.message, /Исходный вопрос/);
  assert.match(out.message, /Почему ты до сих пор куришь/);
  assert.equal(out.handoff, null);

  const finished = finalizeWithEcho(out.session, 'Курю, чтобы после задачи разрешить себе выйти и переключиться.');
  assert.equal(finished.session.status, SESSION_STATUS.COMPLETED);
  assert.equal(finished.session.finalAnswer.includes('переключиться'), true);
  assert.equal(finished.handoff.startNextStage, false);
  assert.equal(finished.handoff.transition.cta, HANDOFF_COPY.cta);
  assert.match(finished.handoff.transition.message, /действительно ли она всё это даёт/);
  assert.ok(finished.handoff.validatedHypotheses.length >= 1);
  assert.match(finished.message, /Запомню это твоими словами/);
  assert.equal(finished.result.question, '');
});

test('mirror and handoff keep the user words and do not invent a diagnosis', () => {
  const session = researchedSession({ initialAnswer: 'Просто так, не думал' });
  const mirror = buildMirror(session);
  assert.equal(mirror.intention, 'Почему я до сих пор курю?');
  assert.match(mirror.initialAnswer, /не думал/);
  assert.ok(mirror.observations.length >= 2);
  assert.equal(mirror.question, 'Почему ты до сих пор куришь?');

  const completed = finalizeWithEcho(session, 'Сигарета помечает паузу. Кофе с ней привычнее. Успокаивает после звонка.');
  const handoff = buildStage2Handoff(completed.session);
  assert.match(handoff.userFinalExplanation, /паузу/);
  assert.ok(handoff.importantUserQuotes.some((q) => /паузу/.test(q)));
  assert.equal(handoff.startNextStage, false);
});

test('normalizeGameMasterResult drops unknown hypothesis actions', () => {
  const result = normalizeGameMasterResult({
    question: 'Один вопрос?',
    hypothesisUpdates: [{ action: 'diagnose', statement: 'зависимость' }, { action: 'create', statement: 'Пауза после задачи' }],
  });
  assert.deepEqual(result.hypothesisUpdates.map((item) => item.action), ['create']);
});
