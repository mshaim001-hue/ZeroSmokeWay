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
  applyDiceRoll,
  closeCurrentCell,
  applyGameMasterResult,
  stripQuestions,
  stripSystemTalk,
  isFormFillReask,
  buildGameMasterContext,
  formatGameMasterContext,
  buildGameMasterMessages,
  buildMirror,
  buildStage2Handoff,
  createDefinition,
  createGameSession,
  evaluateSaturation,
  finalizeWithEcho,
  interpretGameMasterOutput,
  normalizeGameMasterResult,
  recordNarration,
  recordUserAnswer,
  resolvePersonalizedTitle,
  runGameMasterTurn,
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
  assert.match(prompt, /Повторное посещение/);
  assert.match(prompt, /не клетка/);
  assert.match(prompt, /нет контекста/);
  assert.match(prompt, /hypothesisUpdates/);
  assert.match(prompt, /не защищай/);
  assert.match(prompt, /ДИАЛОГ ВНУТРИ КЛЕТКИ/);
  assert.match(prompt, /ПОСЛЕДНЕГО ответа/);
  assert.match(agentConfig, /why_i_smoke_master/);
  assert.match(agentConfig, /GAME_MASTER_PROMPT/);
});

test('context tells the master when a cell is revisited', () => {
  const definition = createDefinition();
  let session = createGameSession({ initialAnswer: 'Нравится' });
  session = applyDiceRoll(session, definition, 5).session;
  session = recordNarration(session, { question: 'Что тело делает в момент прикуривания?' });
  session = recordUserAnswer(session, 'Горло жжёт, руки сами');
  session = closeCurrentCell(session);
  session = { ...session, currentPosition: 22 };
  session = applyDiceRoll(session, definition, 6).session;
  const context = buildGameMasterContext({ session, definition });
  assert.equal(context.currentCell.id, 'body');
  assert.equal(context.currentCell.revisit, true);
  assert.ok(context.currentCell.previousQuestions.some((q) => /тело/.test(q)));
  assert.match(formatGameMasterContext(context), /Повторное посещение/);
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

test('a short answer that leaves the first question is followed, not re-asked', () => {
  const definition = createDefinition();
  let session = createGameSession();
  session = applyDiceRoll(session, definition, 6).session;
  session = recordNarration(session, {
    observation: 'Контроль.',
    question: 'Вспомните недавний момент, когда вы решили не курить — и всё равно закурили. Что происходило перед этим?',
  });
  session = recordUserAnswer(session, 'устал вроде от сигарет');

  const out = interpretGameMasterOutput({
    session,
    definition,
    userMessage: 'устал вроде от сигарет',
    extra: { event: 'user_answer' },
    raw: {
      observation: 'новая нитка: устал от сигарет',
      messageToUser: 'Похоже, мысль не курить появляется из усталости. А что произошло прямо перед этим?',
      question: 'Вспомните момент, когда рука потянулась. Можете привести конкретный пример?',
      hypothesisUpdates: [
        { action: 'create', statement: 'Мысль не курить появляется из усталости от самих сигарет.' },
      ],
      diceReady: false,
    },
  });

  assert.equal(out.diceReady, false);
  assert.equal(out.session.turns.at(-1).cellClosed, false);
  assert.doesNotMatch(out.message, /произошло прямо перед|конкретный пример|рука потянулась/i);
  assert.match(out.message, /устал|сигарет/i);
  assert.match(out.result.question, /\?/);
  assert.equal(out.session.hypotheses.length, 1);
});

test('a living follow-up from the last reply stays open and unlocks no dice', () => {
  const definition = createDefinition();
  let session = createGameSession();
  session = applyDiceRoll(session, definition, 6).session;
  session = recordNarration(session, {
    question: 'Вспомните недавний момент, когда вы решили не курить — и всё равно закурили. Что происходило перед этим?',
  });
  session = recordUserAnswer(session, 'устал вроде от сигарет');

  const applied = applyGameMasterResult(session, definition, {
    messageToUser: 'Устал — это уже интереснее.',
    question: 'Что именно в самом курении тебя начало утомлять?',
    diceReady: false,
  }, { userMessage: 'устал вроде от сигарет', event: 'user_answer' });

  assert.equal(applied.diceReady, false);
  assert.match(applied.result.question, /утомлять|курении/);
  assert.match(applied.message, /Устал/);
  assert.equal(applied.session.turns.at(-1).cellClosed, false);
});

test('the cell closes only when the host ends the thread in human language', () => {
  const definition = createDefinition();
  let session = createGameSession();
  session = applyDiceRoll(session, definition, 6).session;
  session = recordNarration(session, { question: 'Что произошло перед сигаретой?' });
  session = recordUserAnswer(session, 'не знаю, просто хочется');

  const applied = applyGameMasterResult(session, definition, {
    messageToUser: 'Даже когда сигареты надоели, само «хочется» всё равно звучит как достаточная причина. Пока оставим это здесь.',
    question: '',
    diceReady: true,
  }, { userMessage: 'не знаю, просто хочется', event: 'follow_up' });

  assert.equal(applied.diceReady, true);
  assert.equal(applied.result.question, '');
  assert.doesNotMatch(applied.message, /\?/);
  assert.doesNotMatch(applied.message, /рабоч|гипотез|зафиксир/i);
  assert.equal(applied.session.turns.at(-1).cellClosed, true);
});

test('a no on Reward is not hunted back into the cell form', () => {
  const definition = createDefinition();
  let session = createGameSession();
  session = applyDiceRoll(session, definition, 5).session;
  session = {
    ...session,
    currentPosition: 11,
    turns: [{
      ...session.turns[0],
      toPosition: 11,
      landedSlot: 11,
      cellId: 'reward',
      cellTitleShownToUser: 'Награда',
      openingQuestion: 'Бывает ли, что сигарета ощущается как награда после сделанного дела?',
      aiQuestion: 'Бывает ли, что сигарета ощущается как награда после сделанного дела?',
      userAnswer: 'Нет, я вообще об этом не думаю.',
      userAnswers: ['Нет, я вообще об этом не думаю.'],
      cellClosed: false,
    }],
  };

  const applied = applyGameMasterResult(session, definition, {
    messageToUser: 'Тогда давайте иначе. Когда сигарета всё-таки ощущается как награда?',
    question: 'Можете вспомнить случай, когда сигарета была наградой?',
    hypothesisUpdates: [
      { action: 'create', statement: 'Сигарета как награда после дела.' },
      { action: 'weaken', text: 'человек говорит, что об этом не думает' },
    ],
  }, { userMessage: 'Нет, я вообще об этом не думаю.', event: 'user_answer' });

  assert.equal(applied.diceReady, true);
  assert.equal(applied.result.question, '');
  assert.doesNotMatch(applied.message, /всё-таки ощущается|была наградой|конкретный пример/i);
  assert.match(applied.message, /не туда|Хорошо|не про/i);
  assert.equal(applied.session.hypotheses[0].status, HYPOTHESIS_STATUS.WEAKENED);
});

test('apply without a user_answer event still keeps a landing question', () => {
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
    messageToUser: 'Похоже, здесь может быть связь с тем, как сигарета вообще вошла в жизнь.',
    question: 'Что от той первой осталось сегодня?',
  });

  assert.match(applied.result.question, /первой осталось/);
  assert.match(applied.message, /первой осталось/);
});

test('system talk is stripped and a form-fill re-ask is detected', () => {
  assert.equal(
    stripSystemTalk('Вот это интересно. Запомню это как рабочую версию.'),
    'Вот это интересно.',
  );
  assert.equal(
    stripQuestions('Похоже, здесь больше усталости от самого курения. А что произошло прямо перед этим?'),
    'Похоже, здесь больше усталости от самого курения.',
  );
  assert.equal(isFormFillReask(
    'А что произошло прямо перед этим?',
    'Вспомните недавний момент, когда вы решили не курить. Что происходило перед этим?',
  ), true);
  assert.equal(isFormFillReask(
    'Что именно в самом курении тебя начало утомлять?',
    'Вспомните недавний момент, когда вы решили не курить. Что происходило перед этим?',
  ), false);
  assert.match(
    formatGameMasterContext(buildGameMasterContext({
      session: createGameSession(),
      extra: { event: 'user_answer' },
      userMessage: 'устал вроде от сигарет',
    })),
    /ПОСЛЕДНЕМУ ответу|живой диалог/i,
  );
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

test('saturation goes playing → final reality check → mirror, then handoff does not start stage 2', () => {
  const definition = createDefinition();
  let session = researchedSession();
  let out = applyGameMasterResult(session, definition, {
    messageToUser: 'Кажется, мы уже несколько раз возвращаемся к одному и тому же механизму. Проверим его ещё с одной стороны.',
    question: 'А теперь вспомни случай, когда ты спокойно сделал такую же паузу без сигареты.',
    shouldRealityCheck: true,
    possibleSaturation: true,
    userRecognizesHypothesis: false,
  });
  assert.equal(out.session.phase, GAME_PHASE.FINAL_REALITY_CHECK);
  assert.equal(out.session.finalRealityCheckPending, true);
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
  assert.match(finished.handoff.transition.message, /действительно ли сигарета даёт тебе то/);
  assert.ok(finished.handoff.validatedHypotheses.length >= 1);
  assert.match(finished.message, /Запомню это твоими словами/);
  assert.equal(finished.result.question, '');
});

test('a collapsed reality check returns to playing instead of mirror', () => {
  const definition = createDefinition();
  let session = researchedSession();
  session = applyGameMasterResult(session, definition, {
    messageToUser: 'Проверим ещё раз.',
    question: 'Бывала ли такая пауза без сигареты?',
    shouldRealityCheck: true,
  }).session;
  assert.equal(session.phase, GAME_PHASE.FINAL_REALITY_CHECK);

  const out = applyGameMasterResult(session, definition, {
    messageToUser: 'Тогда это не держится.',
    question: 'Где тогда появляется сигарета?',
    hypothesisUpdates: [{ action: 'discard', hypothesisId: 'hyp_pause', text: 'пауза без сигареты уже была' }],
  });
  assert.equal(out.session.phase, GAME_PHASE.PLAYING);
  assert.equal(out.session.hypotheses[0].status, HYPOTHESIS_STATUS.DISCARDED);
  assert.equal(out.diceReady, true);
});

test('mirror works without an initialAnswer', () => {
  const session = researchedSession({ initialAnswer: '' });
  const mirror = buildMirror(session);
  assert.match(mirror.messageToUser, /В начале у нас был один вопрос/);
  assert.doesNotMatch(mirror.messageToUser, /первый ответ/);
  assert.match(mirror.messageToUser, /Почему ты до сих пор куришь/);
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

test('runGameMasterTurn uses the injected OpenAI client', async () => {
  const definition = createDefinition();
  const started = createGameSession({ initialAnswer: 'Курю после задачи' });
  const { session } = applyDiceRoll(started, definition, 3);
  let calls = 0;
  const out = await runGameMasterTurn({
    session,
    definition,
    extra: { event: 'new_cell' },
    openai: {
      chat: {
        completions: {
          create: async () => {
            calls += 1;
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    observation: 'вход',
                    messageToUser: 'Что осталось от первой сигареты?',
                    question: 'Что осталось от первой сигареты?',
                    diceReady: false,
                  }),
                },
              }],
            };
          },
        },
      },
    },
  });
  assert.equal(calls, 1);
  assert.match(out.message, /первой сигареты/);
  assert.equal(out.diceReady, false);
});

test('normalizeGameMasterResult drops unknown hypothesis actions', () => {
  const result = normalizeGameMasterResult({
    question: 'Один вопрос?',
    hypothesisUpdates: [{ action: 'diagnose', statement: 'зависимость' }, { action: 'create', statement: 'Пауза после задачи' }],
  });
  assert.deepEqual(result.hypothesisUpdates.map((item) => item.action), ['create']);
});
